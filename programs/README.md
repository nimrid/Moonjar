# ⚓ Moonjar Solana Programs

> The on-chain smart contract suite for Moonjar built with Anchor 0.30 on Solana, utilizing Token-2022 and Cross-Program Invocation (CPI) into Jupiter V6 aggregators.

---

## 📖 Table of Contents

1. [Programs Overview](#-programs-overview)
2. [On-Chain Architecture & PDAs](#-on-chain-architecture--pdas)
3. [Instructions & Program Flow](#-instructions--program-flow)
4. [Building & Testing](#-building--testing)

---

## 🏗️ Programs Overview

| Program | Directory | Program ID | Description |
| :--- | :--- | :--- | :--- |
| **`vault`** | [`programs/vault`](file:///Users/hng/Documents/antigravity/MoonJar/programs/vault) | `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` | Core child savings vault contract, cost-basis invariants, match pool, and swap CPI |
| **`mock_swap`** | [`programs/mock-swap`](file:///Users/hng/Documents/antigravity/MoonJar/programs/mock-swap) | `C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE` | Offline mock DEX swap harness for deterministic CI/CD integration testing |

---

## 🔑 On-Chain Architecture & PDAs

### 1. Global Config PDA
- **Seeds**: `[b"config"]`
- Stores administrative settings, registered keeper authority public key, canonical Circle USDC mint, and allowed PreStocks Token-2022 mints.

### 2. Child Vault PDA
- **Seeds**: `[b"vault", guardian_pubkey.as_ref(), &vault_index.to_le_bytes()]`
- Owns the on-chain USDC token account and Token-2022 PreStock accounts.
- Enforces basis point allocation caps (`moon_cap_bps`, e.g. 2000 = 20%).
- Tracks cumulative `total_deposited` and `moon_cost_basis`.

### 3. Match Pool PDA
- **Seeds**: `[b"match_pool"]`
- Escrows family sponsor matching funds, programmatically matching deposits according to sponsor rules.

---

## 📜 Instructions & Program Flow

1. **`initialize_config`**: Deploys the global config PDA and sets keeper authority and token whitelist.
2. **`create_vault`**: Initializes a `ChildVault` PDA for a guardian with child nickname hash, avatar tag, and lock duration.
3. **`deposit`**: Deposits USDC into the vault's Save Jar, updating `total_deposited`.
4. **`withdraw`**: Allows the guardian to withdraw Save Jar USDC directly at any time (un-gated by pause status).
5. **`execute_buy`**: Authorized keeper triggers a swap instruction CPI (via Jupiter DLMM/AMM or mock swap), exchanging Save Jar USDC for PreStock tokens while strictly validating the cost-basis cap invariant.
6. **`set_paused`**: Allows the guardian to temporarily pause automatic keeper purchases.

---

## 🧪 Building & Testing

```bash
# 1. Compile Anchor programs:
anchor build

# 2. Run the full Anchor test suite:
anchor test

# 3. Deploy locally to Surfpool cluster:
surfpool run deployment -u --env localnet
```
