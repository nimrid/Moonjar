# 🌙 Moonjar Autonomous Keeper Service (`@moonjar/keeper`)

The Moonjar Keeper is an autonomous agentic bot that acts as a dedicated fiduciary for child savings vaults. It continuously monitors live on-chain `ChildVault` accounts on Solana (or the local Surfpool mainnet fork), tracks real-time PreStocks secondary pricing and fundamental company valuations, enforces strict safety cap invariants, and routes trades through the Jupiter V6 DEX aggregator via on-chain CPI.

---

## 5-Stage Evaluation Pipeline

```mermaid
flowchart TD
    A["1. Vault Status Guard"] -->|Active| B["2. Cost-Basis Cap Check"]
    A -->|Paused / Graduated| Skip1["SKIP: VAULT_PAUSED / GRADUATED"]
    B -->|Headroom > $1.00| C["3. Liquid Cash Check"]
    B -->|Headroom <= $0| Skip2["SKIP: COST_BASIS_CAP_EXCEEDED"]
    C -->|Save Jar >= $1.00| D["4. Valuation & Premium Guard"]
    C -->|Save Jar < $1.00| Skip3["SKIP: INSUFFICIENT_CASH"]
    D -->|Premium <= 10.0%| E["5. Versioned V0 Jupiter Swap CPI"]
    D -->|Premium > 10.0% & !force| Skip4["SKIP: PREMIUM_TOO_HIGH (Too Pricey)"]
    D -->|--force-buy Flag| E
    E --> F["Post-CPI Invariant & Balance Verification"]
```

1. **Vault Status Guard**: Halts immediately if the guardian paused the vault (`isPaused`) or if the child has graduated.
2. **Cost-Basis Cap Headroom Check**: Enforces `(totalDeposited * moonCapBps / 10000) - moonCostBasis > 0`. If the Moon Jar cost basis has reached the guardian's cap (e.g. 20%), the keeper strictly refuses to buy more speculative assets.
3. **Disciplined Micro-Batch Sizing**: Slices trade amount to `tradeAmountUsdc = Math.min(5.00, headroom, saveBalanceUsdc)`. It will never allocate more than $5.00 in a single cycle (DCA discipline) and requires at least $1.00 liquid USDC in the Save Jar.
4. **Valuation Premium Guard (The 10% Safety Rule)**:
   - Queries live Jupiter secondary quotes (`api.jup.ag/swap/v1/quote`).
   - Calculates effective price per share: `executionPrice = tradeAmountUsdc / tokensOut`.
   - Fetches fundamental Mark Price from the PreStocks registry (`prestocks.com/api/prestocks`).
   - Computes secondary premium: `((executionPrice - markPrice) / markPrice) * 100`.
   - **Protection Trigger**: If secondary market DEX liquidity is trading at **> 10.0% premium** above fair mark valuation (for example, SpaceX quoting at elevated premiums on Meteora DLMM), the Keeper **rejects the trade** (`PREMIUM_TOO_HIGH`). The child's money remains 100% safe in USDC in the Save Jar.
5. **Versioned Transaction V0 Execution via Jupiter CPI**:
   - Fetches swap instruction and address lookup tables from Jupiter API (`/swap/v1/swap-instructions`).
   - Pre-creates the Token-2022 Moon Jar Associated Token Account idempotently.
   - Compiles a **Versioned Transaction (v0)** with Address Lookup Tables, shrinking transactions from **1,658 bytes down to 510 bytes** (avoiding Solana's 1,232-byte MTU limit).
   - Injects `ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 })` to ensure sufficient compute budget.
   - Submits `execute_buy` on-chain. The vault PDA signs the inner swap CPI using its program seeds.
   - The contract verifies that USDC spent $\le amount\_in$ and tokens received $\ge min\_out$, updates `moon_cost_basis`, and emits a `Bought` event.

---

## Configuration & Environment Variables

Configure the following variables in your environment or `.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SOLANA_RPC_URL` | `http://127.0.0.1:8899` | Solana RPC endpoint (Surfpool local mainnet fork or devnet/mainnet) |
| `KEEPER_KEYPAIR_PATH` | `~/.config/solana/id.json` | Path to the keeper authority keypair file |
| `KEEPER_PRIVATE_KEY` | *(optional)* | Raw JSON byte array of secret key (useful for Docker/serverless deployments) |
| `FORCE_BUY` | `false` | Set to `true` to override the 10% premium ceiling for testing |

---

## Commands & Usage

### 1. Run Continuous Daemon
Polls the cluster every 30 seconds, scanning all on-chain child vaults:
```bash
pnpm --filter @moonjar/keeper dev
```

### 2. Run One-Shot Evaluation
Runs a single scan across all vaults and exits immediately:
```bash
npx tsx apps/keeper/src/index.ts --once
```

### 3. Force Buy (Testing & Live Demonstration)
Overrides the 10% premium ceiling to execute a live Jupiter V6 swap on Surfpool:
```bash
npx tsx apps/keeper/src/index.ts --once --force-buy
```

### 4. Trigger via Next.js Web API
The web application also provides an HTTP endpoint to trigger the keeper for a specific vault:
```bash
curl -X POST http://localhost:3000/api/keeper \
  -H "Content-Type: application/json" \
  -d '{"vaultAddress": "<VAULT_PDA_ADDRESS>", "forceBuy": true}'
```

---

## Decision Log Structure

The keeper outputs structured JSON records matching `BuyDecisionLog`:

```json
{
  "id": "dec-1727113800000",
  "timestamp": "2026-09-23T16:50:00.000Z",
  "vaultAddress": "5W4iP2Jz78R5Kz4vHkWz3VzB1x...",
  "symbol": "SPACEX",
  "action": "BUY",
  "premiumPct": 4.8,
  "amountInUsdc": 5000000,
  "amountOutTokens": 16516401,
  "machineReason": "PREMIUM_ACCEPTABLE (4.8% <= 10.0%)",
  "humanReasonKid": "Pip found a fair price for SpaceX and tucked a new piece into your Moon Jar!",
  "humanReasonGuardian": "Executed algorithmic purchase for SPACEX at 4.8% premium. $5.00 allocated.",
  "txSignature": "4nZt8k..."
}
```

---

## Token-2022 PreStocks Mints

All PreStocks assets on Solana are Token-2022 mints with 9 decimals:
- **SpaceX**: `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh`
- **Anduril**: `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB`
- **Figure AI**: `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd`
- **Anthropic**: `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw`
- **OpenAI**: `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF`
- **Kalshi**: `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua`
- **Polymarket**: `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP`
