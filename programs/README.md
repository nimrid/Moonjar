# ⚓ Moonjar Solana Programs

> On-chain smart contracts for Moonjar — built with Anchor 0.30 on Solana, using Token-2022 and CPI into Jupiter V6 aggregators.

---

## 📦 Programs

| Program | Program ID | Description |
| :--- | :--- | :--- |
| **`vault`** | `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` | Core child savings vault. All production deployments use this program. |
| **`mock_swap`** | `C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE` | SPL token swap harness deployed to Devnet and loaded in `anchor test`. Enables real on-chain CPI swap execution when live Jupiter AMM pools are unavailable. |

### When is each program used?

| Environment | `vault` deployed? | `mock_swap` deployed? | Swaps Execution |
| :--- | :--- | :--- | :--- |
| **Surfpool (localnet)** | ✅ via `surfpool run deployment` | ✅ deployed | Live Jupiter CPI through local mainnet fork |
| **Devnet** | ✅ on-chain at `8Xi2Ty...` | ✅ on-chain at `C8cAUo...` | Keeper executes CPI to `mock_swap` pool |
| **`anchor test`** | ✅ compiled + loaded automatically | ✅ compiled + loaded automatically | CPI to `mock_swap` test pool |

On Mainnet and Surfpool, the keeper bot routes through **Jupiter Aggregator V6**. On Devnet, because private equity AMM pools only exist on Mainnet, the keeper executes swaps via CPI into **`mock_swap`**, transferring Circle Devnet USDC and receiving mock PreStock tokens.

---

## 🔑 PDAs and Seeds

### Config PDA
- **Seeds**: `[b"config"]`
- Stores: admin pubkey, keeper authority, USDC mint, max slippage BPS, match BPS, match cap per vault, allowed PreStock mints (up to 12)
- Initialized once via `pnpm init-cluster`

### Child Vault PDA
- **Seeds**: `[b"vault", guardian_pubkey (32 bytes), child_index (8 bytes le)]`
- Stores: guardian, child index, nickname hash (sha256), unlock timestamp, moon cap BPS, cost basis, total deposited, basket entries (up to 8), paused/graduated flags
- Owns a USDC Save Jar ATA and Token-2022 Moon Jar ATAs for each basket asset

### Match Pool PDA
- **Seeds**: `[b"match_pool"]`
- Escrows family sponsor USDC that gets matched into vaults by the keeper

---

## 📜 Instructions

| Instruction | Signer | What it does |
| :--- | :--- | :--- |
| `init_config` | Admin | Creates the global Config PDA. Run once per cluster. |
| `create_vault` | Guardian | Creates a ChildVault PDA + Save Jar ATA. Validates basket weights sum to 10,000 bps and all mints are in the allowed list. |
| `deposit` | Guardian | Transfers USDC from guardian wallet into the vault Save Jar ATA. Updates `total_deposited`. |
| `withdraw` | Guardian | Withdraws Save Jar USDC back to guardian. Always allowed even when paused. |
| `execute_buy` | Keeper | Authorised only when `caller == config.keeper`. Passes CPI data + remaining accounts to any swap program (Jupiter on prod, mock_swap in tests). Enforces cost-basis cap and slippage. |
| `set_paused` | Guardian | Pauses or unpauses keeper buy execution. Does not affect withdrawals. |
| `set_caps` | Guardian | Updates `moon_cap_bps` (capped at 5000 = 50% hard max). |
| `set_basket` | Guardian | Replaces basket entries. Validates weights sum to 10,000 bps and all mints are allowed. |
| `apply_match` | Keeper | Moves matching USDC from the Match Pool PDA into the vault Save Jar. |

### On-Chain `execute_buy` invariants

The `execute_buy` instruction verifies all of the following before and after the swap CPI:

1. `caller.key() == config.keeper` — rejects with `NotKeeper` if not
2. `mint_out` is in `config.allowed_mints` — rejects with `MintNotAllowed` if not
3. Cost-basis headroom: `moon_cost_basis + amount_in ≤ total_deposited × moon_cap_bps / 10000` — rejects with `CapExceeded`
4. Slippage: `min_out ≥ quoted_out × (10000 - max_slippage_bps) / 10000` — rejects with `SlippageTooLoose`
5. After CPI: verifies `tokens_received ≥ min_out` — rejects with `SwapOutputTooLow` if DEX underdelivered

---

## 🧪 Building and Testing

```bash
# Compile both programs (produces target/idl/*.json and target/deploy/*.so):
anchor build

# Run all 13 Anchor integration tests against a blank test-validator:
# Uses mock_swap as the CPI swap target. No internet required.
anchor test

# Deploy vault to Surfpool localnet (via Surfpool runbook):
surfpool run deployment -u --env localnet

# Deploy vault to devnet (standard Anchor deploy):
anchor deploy --provider.cluster devnet
```

---

## 🪙 Allowed PreStock Mints

| Company | Mainnet Mint (Token-2022) | Devnet Mint (SPL Token) |
| :--- | :--- | :--- |
| **SpaceX** | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` | `9Qz3LgX2xdwESk3J6MjCFKb6wU7dkRPMJjn12ZywTabm` |
| **Anduril** | `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB` | `J7aeMoZcfNru24tCYM1ruexgR54YCvSw8U5gaM4yPNUA` |
| **Figure AI** | `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd` | `8C2N9hyxbFfbiSUGSehFSq44FLyjS7NDqmHG83ojNE4b` |
| **Anthropic** | `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` | `7WaJ2sDpv3ovXdi2F2Ebr9vhNbKFrmDn3weQVycWSGdu` |
| **OpenAI** | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` | `7dK84mWS4B1zoTLjKhR37rMWAi3PGLe5ADHDxdywPByE` |
| **Kalshi** | `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua` | `5vVRURSQmgiD43Wdmu1xEgJESvmhUu7vGunB1uAN8oX9` |
| **Polymarket** | `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP` | `E9LmFmCLdbfkz5gt7SSmDoxWt8raCWiaAjXaCcA1XWze` |

All tokens use 9 decimals. On Solana Devnet, the mints are created and funded to the Mock Swap pool by running `pnpm setup:devnet-prestocks`, which automatically calls `update_allowed_mints` on the vault's on-chain Config PDA.
