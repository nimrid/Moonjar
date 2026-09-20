# Moonjar: Assumptions & Architectural Decisions

*Document created pursuant to Section 0 & Section 10 of the Moonjar Specification.*

---

## 1. Network & Deployment Environments

1. **Devnet & Localnet Testing (Anchor & Program Core)**:
   - The PreStocks tokens (ANDURIL, ANTHROPIC, FIGUREAI, KALSHI, NEURALINK, OPENAI, POLYMARKET, SPACEX) and their respective AMM pools (Meteora DLMM, Manifest, Whirlpool, Raydium CLMM) are natively deployed on **Solana Mainnet-Beta**.
   - For Anchor unit and integration tests (local validator or bankrun) and Devnet, we provide a **Mock Swap Program** (`programs/mock-swap`) with a deterministic fixed-rate CPI adapter. This allows full verification of:
     - Pre/post balance delta checks
     - Slippage protection (`quoted_out` vs `min_out`)
     - Moon cap headroom checks (`moon_cost_basis + amount_in <= total_deposited * moon_cap_bps / 10000`)
     - Keeper authorization checks
   - **Mainnet Live Testing (Milestone 1 Feasibility)**:
     - Quotes and route discovery are verified against live Jupiter API v1 (`https://api.jup.ag/swap/v1/quote`) and live PreStocks API (`https://prestocks.com/api/prestocks`).
     - Live mainnet transaction execution requires funding the local CLI wallet (`BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57`) with a small amount of SOL and USDC. All mainnet CPI tests are designed to execute with micro-amounts (e.g., $1–$5).

---

## 2. PreStocks Token Eligibility & Liquidity

From live API verification of `https://prestocks.com/api/prestocks` and `api.jup.ag`:

| Symbol | Mint Address | Live Mark | Live Token | Premium % | Jupiter Route (Mainnet) | Impact ($5) | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ANDURIL** | `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB` | $152.44 | $156.29 | +2.53% | Meteora DLMM | 1.21% | **Eligible** (Fair Price) |
| **ANTHROPIC**| `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` | $1,021.74 | $1,005.54 | -1.59% | Manifest / Whirlpool | 0.09% | **Eligible** (Fair Price) |
| **FIGUREAI** | `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd` | $181.78 | $175.21 | -3.61% | Raydium CLMM / Manifest | 2.75% | **Eligible** (Fair Price) |
| **KALSHI** | `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua` | $894.30 | $900.44 | +0.69% | Meteora DLMM | 1.13% | **Eligible** (Fair Price) |
| **NEURALINK**| `PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S` | $333.02 | $444.05 | +33.34% | Manifest | 0.00% | **Eligible** (Too Pricey, Skip) |
| **OPENAI** | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` | $990.25 | $1,154.09 | +16.55% | Manifest | 0.70% | **Eligible** (Too Pricey, Skip) |
| **POLYMARKET**| `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP`| $143.96 | $144.66 | +0.49% | Manifest | 1.03% | **Eligible** (Fair Price) |
| **SPACEX** | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` | $153.82 | $119.82 | -22.10% | Whirlpool / Meteora DLMM | 2.53% | **Eligible** (On Sale, Boosted) |

*Decision*: All 8 tokens have active Jupiter routes and valid liquidity. All 8 are included in the runtime allowed mint set. Preset baskets include:
- **Frontier Tech**: SpaceX (40%), Anduril (35%), Figure AI (25%)
- **AI Frontier**: Anthropic (50%), OpenAI (50%)
- **Prediction Markets**: Kalshi (50%), Polymarket (50%)
- **Custom Basket**: Guardian-selected weights summing to 10,000 bps (100%).

---

## 3. Child Safety, Privacy & COPPA Compliance

1. **Zero Child PII**:
   - The child's identity on-chain is solely a 32-byte hash (`sha256(guardian_pubkey + child_nickname)`). The plaintext name is never written to the blockchain.
   - In the database, the child is identified by a random UUID capability token. Plaintext nickname and chosen avatar (from a preset list of 6 friendly animals) are stored only in the guardian's scoped settings.
2. **Kid Experience Isolation**:
   - Reached via capability URL (`/k/<capability_token>`).
   - No cookies, no local storage tracking, zero third-party analytics (no Google Analytics, no Sentry, no tracking pixels).
   - Fonts (Fredoka, Nunito, Atkinson Hyperlegible) are strictly self-hosted in `/apps/web/public/fonts` to guarantee zero third-party font network requests.
   - All interactive inputs are bounded choice chips (e.g., $1, $5, $10 preset requests). Absolutely no free-form text input.
   - Read-only display of assets with snapshot timestamps ("As of 2:15 PM"). No live-ticking price tickers to eliminate casino-style psychological triggers.
   - No red colors for downside price movements. Neutral cool-slate (`--slate-cool`) is used for drops with reassuring mascot copy ("Ups and downs are normal. Pip keeps an eye on it.").

---

## 4. On-chain vs Off-chain Division of Responsibility

| Capability | Location | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Deposit Custody** | On-chain | PDA owned USDC ATA (`Save Jar`) |
| **Moon Jar Cap** | On-chain | Cost-basis check: `moon_cost_basis + amount_in <= total_deposited * moon_cap_bps / 10000` |
| **Slippage Bounds** | On-chain | Pre/post balance delta must satisfy `amount_out >= min_out` where `min_out >= quoted_out * (10000 - max_slippage_bps) / 10000` |
| **Guardian Withdraw**| On-chain | Guardian authority can withdraw any vault asset at any time prior to graduation |
| **Graduation** | On-chain | `child_authority` can call `graduate()` only after `unlock_ts` |
| **Premium-Aware Weights** | Off-chain (Keeper) | Keeper engine adjusts weights (0x if >+10%, 0.5x if +5%..+10%, 1.0x if -5%..+5%, 1.25x if <-5%) |
| **Stale Price Guard**| Off-chain (Keeper) | Halts buys if snapshots are > 5 minutes old |
| **Price Shock Guard**| Off-chain (Keeper) | Halts buys if any token price swings > 25% between consecutive snapshots |
| **Round-up Accumulator**| Off-chain (Keeper) | Tracks guardian transaction spare change until >= $5 threshold |

---

## 5. Mocking & Transparency Labels

Whenever a mock or simulation is active:
- Web UI displays a non-intrusive pill: `[Mock: Devnet Swap Adapter]` or `[Devnet Mode]`.
- All mock code resides in clearly marked modules (`programs/mock-swap`, `packages/shared/src/mocks/`).
- No mocks are silently hidden or masqueraded as live mainnet trades.
