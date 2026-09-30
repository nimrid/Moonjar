# ⚓ Moonjar Solana Programs

> On-chain smart contracts for Moonjar — built with Anchor 0.30 on Solana, using Token-2022 and CPI into Jupiter V6 aggregators.

---

## 📦 Programs

| Program | Program ID | Description |
| :--- | :--- | :--- |
| **`vault`** | `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` | Core child savings vault. All production deployments use this program. |
| **`mock_swap`** | `C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE` | Offline SPL token swap harness. **Only used by `anchor test`.** Never deployed for real use. |

### When is each program used?

| Environment | `vault` deployed? | `mock_swap` deployed? | Swaps |
| :--- | :--- | :--- | :--- |
| **Surfpool (localnet)** | ✅ via `surfpool run deployment` | ✅ also deployed (but not used by keeper/web) | Live Jupiter CPI through mainnet fork |
| **Devnet** | ✅ via `anchor deploy` | ✅ also deployed (but not used by keeper/web) | Jupiter called but no routes exist on devnet |
| **`anchor test`** | ✅ compiled + loaded automatically | ✅ compiled + loaded automatically | `mock_swap` CPI (fixed-rate test pool) |

The `mock_swap` program is only **invoked** inside `tests/vault.ts`. The keeper bot (`apps/keeper/src/index.ts`) and web app (`apps/web`) always call Jupiter directly and never reference `mock_swap`.

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

## 🪙 Allowed PreStock Mints (Mainnet)

| Company | Mint Address |
| :--- | :--- |
| SpaceX | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` |
| Anduril | `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB` |
| Figure AI | `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd` |
| Anthropic | `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` |
| OpenAI | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` |
| Kalshi | `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua` |
| Polymarket | `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP` |

All are Token-2022 mints with 9 decimals. These mints exist on **Mainnet only**. On devnet and test-validator they do not exist — `init-cluster.ts` registers them in the config but the keeper will find no Jupiter routes.
