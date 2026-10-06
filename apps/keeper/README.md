# 🌙 Moonjar Keeper Service (`@moonjar/keeper`)

> Autonomous fiduciary daemon that scans on-chain ChildVault accounts, evaluates live PreStock valuations against Jupiter secondary market quotes, and executes DCA micro-purchases when conditions pass all safety checks.

---

## How to Run

```bash
# From monorepo root:
pnpm dev:keeper                                    # Daemon — polls every 30 seconds
pnpm --filter @moonjar/keeper once                 # One-shot scan, then exits
npx tsx apps/keeper/src/index.ts --once --force-buy  # One-shot, bypasses 10% premium guard (dev only)
```

Or trigger a specific vault via the web API:

```bash
curl -X POST http://localhost:3000/api/keeper \
  -H "Content-Type: application/json" \
  -H "x-keeper-secret: your_secret_here" \
  -d '{"vaultAddress": "<VAULT_PDA>", "forceBuy": false}'
```

---

## Environment Variables

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `SOLANA_RPC_URL` | `http://127.0.0.1:8899` | Point to Surfpool for localnet, `https://api.devnet.solana.com` for devnet |
| `VAULT_PROGRAM_ID` | `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` | Same on both clusters |
| `KEEPER_KEYPAIR_PATH` | `~/.config/solana/id.json` | Path to keeper authority keypair file |
| `KEEPER_PRIVATE_KEY` | — | Raw JSON byte array. Overrides `KEEPER_KEYPAIR_PATH`. Use for CI/Docker. |
| `FORCE_BUY` | `false` | Set `true` to override premium ceiling. **Disabled in production** (`NODE_ENV === 'production'`). |

---

## What the Keeper Actually Does

On every scan cycle:

1. **Load live PreStock data**: Calls `https://prestocks.com/api/prestocks` for fundamental mark prices. Falls back to `PRESTOCKS_LIST` from `@moonjar/shared` if the API is unreachable.

2. **Fetch all on-chain vaults**: Uses Anchor's `vaultProgram.account.childVault.all()` against the configured RPC.

3. **For each vault, run the 5-stage pipeline**:

```
Stage 1: Vault status check
├─ paused=true  → SKIP (VAULT_PAUSED)
└─ graduated=true → SKIP (GRADUATED)

Stage 2: Cost-basis cap headroom
├─ headroom = (totalDeposited × moonCapBps / 10000) - moonCostBasis
└─ headroom ≤ 0 → SKIP (COST_BASIS_CAP_EXCEEDED)

Stage 3: Liquid USDC check
├─ tradeAmount = min($5.00, headroom, saveBalance)
└─ tradeAmount < $1.00 → SKIP (INSUFFICIENT_CASH)

Stage 4: Valuation premium guard
├─ Calls Jupiter API: api.jup.ag/swap/v1/quote
│   (onlyDirectRoutes=true, slippageBps=200)
├─ executionPrice = tradeAmountUsdc / (tokensOut / 1e9)
├─ premium = (executionPrice - markPrice) / markPrice × 100
├─ premium > 10.0% AND !forceBuy → SKIP (PREMIUM_TOO_HIGH)
└─ No route available → SKIP

Stage 5: Versioned V0 swap execution
├─ Calls Jupiter: api.jup.ag/swap/v1/swap-instructions
├─ Creates Moon Jar Token-2022 ATA idempotently
├─ Resolves Address Lookup Tables
├─ Compiles VersionedTransaction (v0) with ComputeBudget (800k units)
└─ Signs with keeper keypair → sends execute_buy CPI to vault program
```

4. **Records a `BuyDecisionLog`** for every evaluation (BUY or SKIP) with machine reason and two human-readable explanations (kid-friendly + guardian-facing).

---

## On Devnet

The keeper daemon features native **Devnet automated swap execution**:

1. **Automatic Detection:** The keeper inspects `SOLANA_RPC_URL` (`const isDevnet = RPC_URL.includes('devnet')`).
2. **Devnet PreStock Registry:** Candidate mints are resolved via `findPreStockToken()`, which supports both Devnet SPL mints (`9Qz3Lg...`, `7WaJ2s...`) and Mainnet mints.
3. **Simulated Quote & `mock_swap` CPI:** Because Jupiter DEX liquidity pools for private equity tokens only exist on Mainnet, on Devnet the keeper simulates execution pricing and builds CPI instructions targeting the deployed on-chain **`mock_swap`** program (`C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE`) and `mock_swap_pool` PDA.
4. **Real On-Chain Execution:** The keeper signs and submits a real on-chain transaction calling `execute_buy` on the vault program, transferring Circle Devnet USDC from the vault's Save Jar into the mock swap pool and depositing PreStock tokens into the vault's Moon Jar ATA.

## On Surfpool (localnet)

Since Surfpool forks mainnet on demand at `127.0.0.1:8899`, all Jupiter routes, mainnet PreStock mints, and AMM pools are available locally without real money. The keeper calls live Jupiter Aggregator V6 quote and swap-instruction APIs.

---

## Decision Log Format

```json
{
  "id": "dec-1727113800000",
  "timestamp": "2026-09-30T14:30:00.000Z",
  "vaultAddress": "5W4iP2Jz...",
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

Skips follow the same shape with `"action": "SKIP"`, no `txSignature`, and the machine reason explaining which stage triggered the skip.
