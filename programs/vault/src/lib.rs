use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::token_interface::{self, Mint as InterfaceMint, TokenAccount as InterfaceTokenAccount, TokenInterface};

declare_id!("8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno");

pub const MAX_ALLOWED_MINTS: usize = 12;
pub const MAX_BASKET_LEN: usize = 8;
pub const HARD_MAX_MOON_CAP_BPS: u16 = 5000; // 50%
pub const BPS_TOTAL: u16 = 10000;

#[program]
pub mod vault {
    use super::*;

    pub fn init_config(
        ctx: Context<InitConfig>,
        keeper: Pubkey,
        max_slippage_bps: u16,
        match_bps: u16,
        match_cap_per_vault: u64,
        allowed_mints: Vec<Pubkey>,
    ) -> Result<()> {
        require!(max_slippage_bps <= 1000, ErrorCode::SlippageTooLoose); // Max 10%
        require!(allowed_mints.len() <= MAX_ALLOWED_MINTS, ErrorCode::TooManyAllowedMints);

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.keeper = keeper;
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.max_slippage_bps = max_slippage_bps;
        config.match_bps = match_bps;
        config.match_cap_per_vault = match_cap_per_vault;
        config.match_pool_bump = ctx.bumps.match_pool;
        config.bump = ctx.bumps.config;

        let mut mint_array = [Pubkey::default(); MAX_ALLOWED_MINTS];
        for (i, m) in allowed_mints.iter().enumerate() {
            mint_array[i] = *m;
        }
        config.allowed_mints = mint_array;
        config.allowed_count = allowed_mints.len() as u8;

        msg!("Config initialized with {} allowed mints", config.allowed_count);
        Ok(())
    }

    pub fn create_vault(
        ctx: Context<CreateVault>,
        child_index: u64,
        nickname_hash: [u8; 32],
        unlock_ts: i64,
        moon_cap_bps: u16,
        basket: Vec<BasketEntry>,
        roundup_threshold: u64,
    ) -> Result<()> {
        require!(moon_cap_bps <= HARD_MAX_MOON_CAP_BPS, ErrorCode::CapExceeded);
        require!(!basket.is_empty() && basket.len() <= MAX_BASKET_LEN, ErrorCode::WeightsInvalid);

        // Validate basket weights sum to 10000 and all mints are allowed
        let mut total_weight = 0u16;
        for entry in &basket {
            require!(ctx.accounts.config.is_mint_allowed(&entry.mint), ErrorCode::MintNotAllowed);
            total_weight = total_weight.checked_add(entry.weight_bps).ok_or(ErrorCode::WeightsInvalid)?;
        }
        require!(total_weight == BPS_TOTAL, ErrorCode::WeightsInvalid);

        let vault = &mut ctx.accounts.vault;
        vault.guardian = ctx.accounts.guardian.key();
        vault.child_authority = None;
        vault.nickname_hash = nickname_hash;
        vault.child_index = child_index;
        vault.unlock_ts = unlock_ts;
        vault.moon_cap_bps = moon_cap_bps;
        vault.roundup_threshold = roundup_threshold;
        vault.total_deposited = 0;
        vault.moon_cost_basis = 0;
        vault.match_received = 0;
        vault.paused = false;
        vault.graduated = false;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        let mut basket_array = [BasketEntry::default(); MAX_BASKET_LEN];
        for (i, entry) in basket.iter().enumerate() {
            basket_array[i] = *entry;
        }
        vault.basket = basket_array;
        vault.basket_len = basket.len() as u8;

        emit!(VaultCreated {
            vault: vault.key(),
            guardian: vault.guardian,
            child_index,
            unlock_ts,
            moon_cap_bps,
        });

        Ok(())
    }

    pub fn set_basket(ctx: Context<GuardianAction>, basket: Vec<BasketEntry>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(!vault.graduated, ErrorCode::Graduated);
        require!(!basket.is_empty() && basket.len() <= MAX_BASKET_LEN, ErrorCode::WeightsInvalid);

        let mut total_weight = 0u16;
        for entry in &basket {
            require!(ctx.accounts.config.is_mint_allowed(&entry.mint), ErrorCode::MintNotAllowed);
            total_weight = total_weight.checked_add(entry.weight_bps).ok_or(ErrorCode::WeightsInvalid)?;
        }
        require!(total_weight == BPS_TOTAL, ErrorCode::WeightsInvalid);

        let mut basket_array = [BasketEntry::default(); MAX_BASKET_LEN];
        for (i, entry) in basket.iter().enumerate() {
            basket_array[i] = *entry;
        }
        vault.basket = basket_array;
        vault.basket_len = basket.len() as u8;

        emit!(BasketChanged {
            vault: vault.key(),
            basket_len: vault.basket_len,
        });

        Ok(())
    }

    pub fn set_caps(
        ctx: Context<GuardianAction>,
        moon_cap_bps: u16,
        roundup_threshold: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(!vault.graduated, ErrorCode::Graduated);
        require!(moon_cap_bps <= HARD_MAX_MOON_CAP_BPS, ErrorCode::CapExceeded);

        vault.moon_cap_bps = moon_cap_bps;
        vault.roundup_threshold = roundup_threshold;
        Ok(())
    }

    pub fn set_paused(ctx: Context<GuardianAction>, paused: bool) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.paused = paused;

        emit!(Paused {
            vault: vault.key(),
            paused,
        });
        Ok(())
    }

    pub fn set_child_authority(
        ctx: Context<GuardianAction>,
        child_authority: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(!vault.graduated, ErrorCode::Graduated);
        vault.child_authority = Some(child_authority);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, memo: [u8; 32]) -> Result<()> {
        require!(!ctx.accounts.vault.graduated, ErrorCode::Graduated);
        require!(amount > 0, ErrorCode::InsufficientSave);

        // Transfer USDC from sender to Save Jar
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.depositor_token.to_account_info(),
                to: ctx.accounts.save_jar_token.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault.total_deposited.checked_add(amount).ok_or(ErrorCode::CapExceeded)?;

        emit!(Deposited {
            vault: vault.key(),
            from: ctx.accounts.depositor.key(),
            amount,
            memo,
        });

        Ok(())
    }

    pub fn execute_buy<'info>(
        ctx: Context<'info, ExecuteBuy<'info>>,
        mint_out: Pubkey,
        amount_in: u64,
        quoted_out: u64,
        min_out: u64,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let config = &ctx.accounts.config;

        // 1. Invariants check
        require!(!vault.paused, ErrorCode::Paused);
        require!(!vault.graduated, ErrorCode::Graduated);
        require!(config.is_mint_allowed(&mint_out), ErrorCode::MintNotAllowed);
        require!(vault.is_mint_in_basket(&mint_out), ErrorCode::MintNotInBasket);

        // Check Save Jar balance >= amount_in
        require!(ctx.accounts.save_jar_token.amount >= amount_in, ErrorCode::InsufficientSave);

        // Cost-basis moon cap check:
        // moon_cost_basis + amount_in <= total_deposited * moon_cap_bps / 10000
        let max_moon_cost = (vault.total_deposited as u128)
            .checked_mul(vault.moon_cap_bps as u128)
            .ok_or(ErrorCode::CapExceeded)?
            / (BPS_TOTAL as u128);

        let new_moon_cost = (vault.moon_cost_basis as u128)
            .checked_add(amount_in as u128)
            .ok_or(ErrorCode::CapExceeded)?;

        require!(new_moon_cost <= max_moon_cost, ErrorCode::CapExceeded);

        // Slippage requirement from keeper:
        // min_out >= quoted_out * (10000 - max_slippage_bps) / 10000
        let min_allowed_out = (quoted_out as u128)
            .checked_mul((BPS_TOTAL.saturating_sub(config.max_slippage_bps)) as u128)
            .ok_or(ErrorCode::SlippageTooLoose)?
            / (BPS_TOTAL as u128);

        require!(min_out as u128 >= min_allowed_out, ErrorCode::SlippageTooLoose);

        // 2. Pre-CPI balance snapshot
        let usdc_balance_before = ctx.accounts.save_jar_token.amount;
        let mint_out_balance_before = ctx.accounts.moon_jar_token.amount;

        // 3. Execute CPI with Vault PDA as signer
        let guardian_key = vault.guardian;
        let child_index_bytes = vault.child_index.to_le_bytes();
        let vault_bump = vault.bump;

        let seeds: &[&[u8]] = &[
            b"vault".as_ref(),
            guardian_key.as_ref(),
            &child_index_bytes,
            &[vault_bump],
        ];
        let signer = &[&seeds[..]];

        // Build account metas from remaining accounts
        let mut metas = Vec::with_capacity(ctx.remaining_accounts.len());
        for acc in ctx.remaining_accounts.iter() {
            if acc.key == &vault.key() {
                if acc.is_writable {
                    metas.push(AccountMeta::new(*acc.key, true));
                } else {
                    metas.push(AccountMeta::new_readonly(*acc.key, true));
                }
            } else if acc.is_writable {
                metas.push(AccountMeta::new(*acc.key, acc.is_signer));
            } else {
                metas.push(AccountMeta::new_readonly(*acc.key, acc.is_signer));
            }
        }

        let ix = Instruction {
            program_id: ctx.accounts.swap_program.key(),
            accounts: metas,
            data: cpi_data,
        };

        invoke_signed(&ix, ctx.remaining_accounts, signer)?;

        // 4. Post-CPI balance verification (reload)
        ctx.accounts.save_jar_token.reload()?;
        ctx.accounts.moon_jar_token.reload()?;

        let usdc_balance_after = ctx.accounts.save_jar_token.amount;
        let mint_out_balance_after = ctx.accounts.moon_jar_token.amount;

        let usdc_spent = usdc_balance_before.saturating_sub(usdc_balance_after);
        let tokens_received = mint_out_balance_after.saturating_sub(mint_out_balance_before);

        require!(usdc_spent <= amount_in, ErrorCode::BalanceDeltaInvalid);
        require!(tokens_received >= min_out, ErrorCode::SlippageBreached);

        // 5. Update state
        let vault_mut = &mut ctx.accounts.vault;
        vault_mut.moon_cost_basis = vault_mut
            .moon_cost_basis
            .checked_add(usdc_spent)
            .ok_or(ErrorCode::CapExceeded)?;

        emit!(Bought {
            vault: vault_mut.key(),
            mint: mint_out,
            amount_in: usdc_spent,
            amount_out: tokens_received,
        });

        Ok(())
    }

    pub fn apply_match(ctx: Context<ApplyMatch>, deposit_amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        let vault = &mut ctx.accounts.vault;

        let raw_match = (deposit_amount as u128)
            .checked_mul(config.match_bps as u128)
            .ok_or(ErrorCode::MatchCapReached)?
            / (BPS_TOTAL as u128);

        let match_amount = raw_match as u64;
        require!(match_amount > 0, ErrorCode::InsufficientSave);

        let new_match_total = vault
            .match_received
            .checked_add(match_amount)
            .ok_or(ErrorCode::MatchCapReached)?;
        require!(new_match_total <= config.match_cap_per_vault, ErrorCode::MatchCapReached);

        // Transfer from match pool to vault Save Jar
        let match_pool_bump = config.match_pool_bump;
        let seeds: &[&[u8]] = &[b"match_pool".as_ref(), &[match_pool_bump]];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.match_pool_token.to_account_info(),
                to: ctx.accounts.save_jar_token.to_account_info(),
                authority: ctx.accounts.match_pool.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, match_amount)?;

        vault.match_received = new_match_total;
        vault.total_deposited = vault.total_deposited.checked_add(match_amount).ok_or(ErrorCode::CapExceeded)?;

        emit!(MatchApplied {
            vault: vault.key(),
            amount: match_amount,
        });

        Ok(())
    }

    pub fn fund_match_pool(ctx: Context<FundMatchPool>, amount: u64) -> Result<()> {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.funder_token.to_account_info(),
                to: ctx.accounts.match_pool_token.to_account_info(),
                authority: ctx.accounts.funder.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;
        Ok(())
    }

    /// Allows the guardian to withdraw any token held by the vault PDA at any time,
    /// regardless of `unlock_ts` or `paused` state. This is intentional: the guardian
    /// retains emergency exit rights over funds they deposited. Pre-unlock withdrawals
    /// are a guardian-only action and do not affect the child's experience unless the
    /// guardian deliberately empties the vault. Post-graduation, the child_authority
    /// becomes the guardian and inherits this right.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let guardian_key = vault.guardian;
        let child_index_bytes = vault.child_index.to_le_bytes();
        let vault_bump = vault.bump;

        let seeds: &[&[u8]] = &[
            b"vault".as_ref(),
            guardian_key.as_ref(),
            &child_index_bytes,
            &[vault_bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            token_interface::TransferChecked {
                from: ctx.accounts.vault_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.guardian_token.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer,
        );
        token_interface::transfer_checked(transfer_ctx, amount, ctx.accounts.mint.decimals)?;

        // If withdrawing USDC, adjust total_deposited accordingly
        if ctx.accounts.mint.key() == ctx.accounts.config.usdc_mint {
            vault.total_deposited = vault.total_deposited.saturating_sub(amount);
        }

        Ok(())
    }

    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let now = Clock::get()?.unix_timestamp;

        require!(now >= vault.unlock_ts, ErrorCode::NotYetUnlocked);
        require!(!vault.graduated, ErrorCode::Graduated);

        vault.guardian = ctx.accounts.child_authority.key();
        vault.graduated = true;

        emit!(Graduated {
            vault: vault.key(),
            child_authority: ctx.accounts.child_authority.key(),
        });

        Ok(())
    }
}

// ---------------- ACCOUNTS ----------------

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + (32 * MAX_ALLOWED_MINTS) + 1 + 32 + 2 + 2 + 8 + 1 + 1 + 64,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        seeds = [b"match_pool"],
        bump
    )]
    /// CHECK: PDA for match pool authority
    pub match_pool: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = match_pool,
    )]
    pub match_pool_token: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(child_index: u64)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub guardian: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = guardian,
        space = 8 + 32 + 33 + 32 + 8 + 8 + 2 + ((32 + 2) * MAX_BASKET_LEN) + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 1 + 64,
        seeds = [b"vault", guardian.key().as_ref(), &child_index.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, ChildVault>,

    #[account(
        init_if_needed,
        payer = guardian,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault,
    )]
    pub save_jar_token: Account<'info, TokenAccount>,

    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct GuardianAction<'info> {
    pub guardian: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        has_one = guardian @ ErrorCode::NotGuardian,
        seeds = [b"vault", guardian.key().as_ref(), &vault.child_index.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, ChildVault>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.guardian.as_ref(), &vault.child_index.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, ChildVault>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault,
    )]
    pub save_jar_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor_token: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExecuteBuy<'info> {
    #[account(
        constraint = keeper.key() == config.keeper @ ErrorCode::NotKeeper
    )]
    pub keeper: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [b"vault", vault.guardian.as_ref(), &vault.child_index.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Box<Account<'info, ChildVault>>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault,
    )]
    pub save_jar_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_out,
        associated_token::authority = vault,
        associated_token::token_program = token_out_program,
    )]
    pub moon_jar_token: Box<InterfaceAccount<'info, InterfaceTokenAccount>>,

    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub mint_out: Box<InterfaceAccount<'info, InterfaceMint>>,

    /// CHECK: The external swap program (Jupiter or mock swap)
    pub swap_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub token_out_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ApplyMatch<'info> {
    #[account(constraint = caller.key() == config.keeper @ ErrorCode::NotKeeper)]
    pub caller: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [b"vault", vault.guardian.as_ref(), &vault.child_index.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Box<Account<'info, ChildVault>>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault,
    )]
    pub save_jar_token: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"match_pool"],
        bump = config.match_pool_bump
    )]
    /// CHECK: Match pool PDA authority
    pub match_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = match_pool,
    )]
    pub match_pool_token: Box<Account<'info, TokenAccount>>,

    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FundMatchPool<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"match_pool"],
        bump = config.match_pool_bump
    )]
    /// CHECK: Match pool PDA authority
    pub match_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = match_pool,
    )]
    pub match_pool_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub funder_token: Account<'info, TokenAccount>,

    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub guardian: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        has_one = guardian @ ErrorCode::NotGuardian,
        seeds = [b"vault", guardian.key().as_ref(), &vault.child_index.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, ChildVault>,

    #[account(
        mut,
        constraint = vault_token.owner == vault.key()
    )]
    pub vault_token: InterfaceAccount<'info, InterfaceTokenAccount>,

    #[account(
        mut,
        constraint = guardian_token.owner == guardian.key()
    )]
    pub guardian_token: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub mint: InterfaceAccount<'info, InterfaceMint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    pub child_authority: Signer<'info>,

    #[account(
        mut,
        constraint = vault.child_authority == Some(child_authority.key()) @ ErrorCode::NotGuardian,
        seeds = [b"vault", vault.guardian.as_ref(), &vault.child_index.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, ChildVault>,
}

// ---------------- STATE ----------------

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub keeper: Pubkey,
    pub allowed_mints: [Pubkey; MAX_ALLOWED_MINTS],
    pub allowed_count: u8,
    pub usdc_mint: Pubkey,
    pub max_slippage_bps: u16,
    pub match_bps: u16,
    pub match_cap_per_vault: u64,
    pub match_pool_bump: u8,
    pub bump: u8,
}

impl Config {
    pub fn is_mint_allowed(&self, mint: &Pubkey) -> bool {
        for i in 0..(self.allowed_count as usize) {
            if &self.allowed_mints[i] == mint {
                return true;
            }
        }
        false
    }
}

#[account]
pub struct ChildVault {
    pub guardian: Pubkey,
    pub child_authority: Option<Pubkey>,
    pub nickname_hash: [u8; 32],
    pub child_index: u64,
    pub unlock_ts: i64,
    pub moon_cap_bps: u16,
    pub basket: [BasketEntry; MAX_BASKET_LEN],
    pub basket_len: u8,
    pub roundup_threshold: u64,
    pub total_deposited: u64,
    pub moon_cost_basis: u64,
    pub match_received: u64,
    pub paused: bool,
    pub graduated: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl ChildVault {
    pub fn is_mint_in_basket(&self, mint: &Pubkey) -> bool {
        for i in 0..(self.basket_len as usize) {
            if &self.basket[i].mint == mint {
                return true;
            }
        }
        false
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
pub struct BasketEntry {
    pub mint: Pubkey,
    pub weight_bps: u16,
}

// ---------------- EVENTS ----------------

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub guardian: Pubkey,
    pub child_index: u64,
    pub unlock_ts: i64,
    pub moon_cap_bps: u16,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub from: Pubkey,
    pub amount: u64,
    pub memo: [u8; 32],
}

#[event]
pub struct Bought {
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
}

#[event]
pub struct MatchApplied {
    pub vault: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Paused {
    pub vault: Pubkey,
    pub paused: bool,
}

#[event]
pub struct Graduated {
    pub vault: Pubkey,
    pub child_authority: Pubkey,
}

#[event]
pub struct BasketChanged {
    pub vault: Pubkey,
    pub basket_len: u8,
}

// ---------------- ERRORS ----------------

#[error_code]
pub enum ErrorCode {
    #[msg("Vault buys are paused by the guardian")]
    Paused,
    #[msg("Vault has already graduated")]
    Graduated,
    #[msg("Mint is not in Config.allowed_mints")]
    MintNotAllowed,
    #[msg("Mint is not in ChildVault basket")]
    MintNotInBasket,
    #[msg("Basket weights must sum to 10000 bps")]
    WeightsInvalid,
    #[msg("Moon Jar cap on cost-basis exceeded")]
    CapExceeded,
    #[msg("Insufficient balance in Save Jar")]
    InsufficientSave,
    #[msg("Slippage tolerance exceeds maximum configured")]
    SlippageTooLoose,
    #[msg("Slippage tolerance breached on execution")]
    SlippageBreached,
    #[msg("Caller is not the guardian")]
    NotGuardian,
    #[msg("Caller is not the keeper")]
    NotKeeper,
    #[msg("Vault unlock timestamp has not yet been reached")]
    NotYetUnlocked,
    #[msg("Sponsor match cap reached for this vault")]
    MatchCapReached,
    #[msg("Balance delta verification failed: USDC decrease exceeded input")]
    BalanceDeltaInvalid,
    #[msg("Too many allowed mints provided")]
    TooManyAllowedMints,
}
