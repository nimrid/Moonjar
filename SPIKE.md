# Milestone 1: Feasibility Spike & PreStocks Jupiter Liquidity Report

**Execution Date**: 2026-09-20T01:29:47.000Z
**PreStocks API**: `https://prestocks.com/api/prestocks`
**Jupiter Quote API**: `https://api.jup.ag/swap/v1/quote`

## 1. Token Liquidity & Route Findings Table

| Token | Mint Address | Mark Price | Token Price | Premium % | Jupiter Route? | Impact @ $5 | Impact @ $25 | Verdict |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **ANDURIL**<br>(Anduril PreStocks) | `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB` | $152.44 | $155.04 | +1.71% | ✅ Yes | 1.06% | 1.67% | **Eligible (Fair Price)** |
| **ANTHROPIC**<br>(Anthropic PreStocks) | `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` | $1021.74 | $998.00 | -2.32% | ✅ Yes | 0.00% | 0.00% | **Eligible (Fair Price)** |
| **FIGUREAI**<br>(Figure AI PreStocks) | `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd` | $181.78 | $175.21 | -3.61% | ✅ Yes | 2.48% | 2.49% | **Eligible (Fair Price)** |
| **KALSHI**<br>(Kalshi PreStocks) | `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua` | $894.30 | $900.25 | +0.67% | ✅ Yes | 0.87% | 0.87% | **Eligible (Fair Price)** |
| **NEURALINK**<br>(Neuralink PreStocks) | `PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S` | $333.02 | $424.73 | +27.54% | ✅ Yes | 4.34% | 4.34% | **Eligible (High Premium - Skip Cycle)** |
| **OPENAI**<br>(OpenAI PreStocks) | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` | $990.25 | $1149.79 | +16.11% | ✅ Yes | 1.09% | 1.09% | **Eligible (High Premium - Skip Cycle)** |
| **POLYMARKET**<br>(Polymarket PreStocks) | `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP` | $143.96 | $143.34 | -0.44% | ✅ Yes | 1.03% | 1.03% | **Eligible (Fair Price)** |
| **SPACEX**<br>(SpaceX PreStocks) | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` | $152.94 | $119.70 | -21.73% | ✅ Yes | 2.71% | 2.71% | **Eligible (On Sale - Boost 1.25x)** |

## 2. Route Topology & AMM Venues Observed

- **ANDURIL**: Meteora DLMM
- **ANTHROPIC**: GoonFi V2 -> Manifest
- **FIGUREAI**: Byreal -> Quantum -> Raydium CLMM
- **KALSHI**: GoonFi V2 -> Meteora DLMM
- **NEURALINK**: Manifest
- **OPENAI**: Meteora DLMM
- **POLYMARKET**: Manifest
- **SPACEX**: Byreal -> Meteora DLMM

## 3. PDA CPI Architecture & Feasibility

### PDA Signer Mechanics
The vault is an Anchor Program Derived Address (PDA) with seeds:
```rust
[b"vault", guardian.key().as_ref(), &child_index.to_le_bytes()]
```

When executing a Jupiter swap:
1. The **Keeper** signs and submits the transaction calling `execute_buy`.
2. The Anchor program verifies that `amount_in <= Save Jar Balance` and `moon_cost_basis + amount_in <= total_deposited * moon_cap_bps / 10000`.
3. The Anchor program records pre-swap balances:
   - `pre_usdc = usdc_account.amount`
   - `pre_out = token_out_account.amount`
4. The Anchor program invokes Jupiter's swap instruction via CPI using `invoke_signed` with the Vault PDA seeds.
5. The Anchor program records post-swap balances:
   - `post_usdc = usdc_account.reload()?.amount`
   - `post_out = token_out_account.reload()?.amount`
6. **Balance-Delta Verification**:
   - Program verifies `pre_usdc.saturating_sub(post_usdc) <= amount_in`
   - Program verifies `post_out.saturating_sub(pre_out) >= min_out`
   - Program verifies `min_out >= quoted_out * (10000 - max_slippage_bps) / 10000`
7. This architecture is immune to malicious return values or intermediary route exploits because it directly checks SPL token account balance deltas.

## 4. Final Basket-Eligible List & Presets

All 8 live PreStocks tokens are confirmed eligible and routeable on Jupiter:
1. **ANDURIL** (`PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB`)
2. **ANTHROPIC** (`Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw`)
3. **FIGUREAI** (`PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd`)
4. **KALSHI** (`PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua`)
5. **NEURALINK** (`PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S`)
6. **OPENAI** (`PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF`)
7. **POLYMARKET** (`Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP`)
8. **SPACEX** (`PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh`)

### Verified Basket Presets:
- **Frontier Tech**: SpaceX (40%), Anduril (35%), Figure AI (25%)
- **AI Frontier**: Anthropic (50%), OpenAI (50%)
- **Prediction Markets**: Kalshi (50%), Polymarket (50%)
- **Custom Basket**: Guardian-selected weights summing to 10,000 bps (100%).

## 5. Mainnet vs Devnet/Local Testing Environment Note
- Mainnet routes and liquidity verified.
- For local Anchor tests and deterministic CI validation, a mock swap program (`programs/mock-swap`) provides a 1:1 fixed-rate CPI test harness with identical CPI accounts and pre/post balance-delta checking.
- In UI, mock states are explicitly flagged with `[Devnet / Test Mode]`.
