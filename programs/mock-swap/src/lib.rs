use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("6JBe6PqaEGGWgmcSiCMptyLvhekA8uyuvKNXuwNZktsJ");

#[program]
pub mod mock_swap {
    use super::*;

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        // 1. Transfer input tokens from user to pool
        let transfer_in_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.user_source.to_account_info(),
                to: ctx.accounts.pool_destination.to_account_info(),
                authority: ctx.accounts.user_authority.to_account_info(),
            },
        );
        token::transfer(transfer_in_ctx, amount_in)?;

        // 2. Transfer output tokens from pool to user
        let pool_bump = ctx.bumps.pool_authority;
        let seeds: &[&[u8]] = &[b"mock_swap_pool".as_ref(), &[pool_bump]];
        let signer = &[&seeds[..]];

        let transfer_out_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.pool_source.to_account_info(),
                to: ctx.accounts.user_destination.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_out_ctx, amount_out)?;

        msg!("Mock swap executed: amount_in={}, amount_out={}", amount_in, amount_out);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Swap<'info> {
    /// Authority signing for the input transfer (e.g., Vault PDA)
    pub user_authority: Signer<'info>,

    #[account(mut)]
    pub user_source: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_destination: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"mock_swap_pool"],
        bump,
    )]
    /// CHECK: PDA signer for pool funds
    pub pool_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub pool_destination: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_source: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
