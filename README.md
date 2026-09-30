# 🍯 Moonjar

> **Autonomous Pre-IPO Savings Vault on Solana for kids, powered by Token-2022 PreStocks, Privy embedded wallets, and an on-chain fiduciary keeper.**

[![Solana](https://img.shields.io/badge/Solana-Token--2022-14F195?logo=solana&logoColor=white)](https://solana.com)
[![Privy](https://img.shields.io/badge/Privy-Embedded_Wallets-512DA8)](https://privy.io)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-000000?logo=next.js)](https://nextjs.org/)
[![Anchor](https://img.shields.io/badge/Anchor-0.30-blue)](https://www.anchor-lang.com/)

---

## 📖 Table of Contents

1. [What Is Moonjar?](#-what-is-moonjar)
2. [Three Ways to Run It](#-three-ways-to-run-it)
3. [Monorepo Structure](#-monorepo-structure)
4. [Prerequisites](#-prerequisites)
5. [Option A — Local Development with Surfpool (Recommended)](#-option-a--local-development-with-surfpool-recommended)
6. [Option B — Devnet](#-option-b--devnet)
7. [Option C — Offline Unit Tests (anchor test)](#-option-c--offline-unit-tests-anchor-test)
8. [Environment Variables Reference](#-environment-variables-reference)
9. [Core Safety Invariants](#-core-safety-invariants)
10. [Testing](#-testing)

---

## 🌟 What Is Moonjar?

Moonjar teaches children patient, long-term wealth-building by splitting savings into two on-chain jars:

- **Save Jar**: Circle USDC (stable, always accessible, never volatile)
- **Moon Jar**: Tokenized private equity (SpaceX, OpenAI, Anduril, etc.) via PreStocks on Solana Token-2022

A parent (Guardian) manages the vault via a Privy embedded Solana wallet. The child accesses their view via a private URL (`/k/<token>`) — no seed phrases, no keys, no signing.

An autonomous **Keeper bot** continuously evaluates live Jupiter DEX quotes against PreStocks fundamental mark prices and executes DCA micro-purchases (max \$5 per cycle) only when the secondary market premium is ≤ 10%.

---

## 🏗️ Three Ways to Run It

| Mode | What runs | Real Jupiter swaps? | USDC mint used | Who uses it |
| :--- | :--- | :--- | :--- | :--- |
| **Surfpool (localnet)** | Surfpool forks mainnet on-demand at `127.0.0.1:8899` | ✅ Yes (fork of mainnet pools) | Mainnet USDC (`EPjFWdd5...`) | Local developers |
| **Devnet** | Solana public devnet RPC | ❌ No (no real PreStock pools exist on devnet) | Devnet USDC (`4zMMC9...`) | Remote developers/CI |
| **Anchor unit tests** | `solana-test-validator` (blank ledger, in-process) | ❌ No (uses `mock_swap` CPI harness) | Test mint (created in-test) | Rust/program developers |

---

## 📁 Monorepo Structure

```
MoonJar/
├── apps/
│   ├── web/             # Next.js 14 app — Guardian Suite + Child Portal
│   └── keeper/          # Autonomous Keeper bot (reads SOLANA_RPC_URL, fires Jupiter swaps)
├── packages/
│   └── shared/          # Zod types, PreStocks registry, Flesch-Kincaid linters
├── programs/
│   ├── vault/           # Anchor program: ChildVault PDA, cost-basis caps, Jupiter CPI
│   └── mock-swap/       # Offline test-only CPI harness (only used by anchor test)
├── runbooks/
│   └── deployment/      # Surfpool Infrastructure-as-Code runbook (deploys both programs instantly)
├── scripts/
│   ├── fund.ts          # Surfpool cheatcode: airdrop 5 SOL + set USDC balance (localnet only)
│   └── init-cluster.ts  # Initialises on-chain Config PDA (works on localnet AND devnet)
├── tests/
│   └── vault.ts         # Anchor integration tests — use mock_swap, run on blank test-validator
├── Anchor.toml          # Same program IDs on both localnet and devnet
└── package.json         # pnpm 9 workspace root
```

> **Key point**: `mock_swap` is only referenced in `tests/vault.ts`. The keeper bot and web app always talk to Jupiter directly. You never need to deploy `mock_swap` unless you're running `anchor test`.

---

## 🧰 Prerequisites

- **Node.js** ≥ 18.18.0
- **pnpm** ≥ 9.0.0 → `npm install -g pnpm`
- **Anchor CLI** 1.2.0 → `avm use 1.2.0`
- **Rust** ≥ 1.75 + Solana CLI ≥ 1.18 *(needed to compile programs)*
- **Surfpool** *(needed for localnet only)* → `curl -sL https://run.surfpool.run/ | bash`

---

## 🔵 Option A — Local Development with Surfpool (Recommended)

Surfpool forks Solana mainnet on demand at `127.0.0.1:8899`. This means real mainnet USDC, real PreStock Token-2022 mints, and real Jupiter liquidity pools are all available locally with no real money involved.

### Step 1 — Install dependencies

```bash
git clone https://github.com/moonjar/moonjar.git
cd MoonJar
pnpm install
```

### Step 2 — Configure environment

Create `apps/web/.env.local` (and optionally a root `.env`) with:

```env
# Privy — get your own App ID & Secret from https://privy.io
NEXT_PUBLIC_PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_SECRET=<your_privy_app_secret>

# Surfpool localnet RPC (Solana mainnet fork at localhost)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
SOLANA_RPC_URL=http://127.0.0.1:8899

# Vault program (same ID on both localnet and devnet)
NEXT_PUBLIC_VAULT_PROGRAM_ID=8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno

# Keeper HTTP API secret (any string you choose)
KEEPER_API_SECRET=your_secret_here
```

> `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta` is intentional when using Surfpool — it forks mainnet state, so the app uses the mainnet USDC mint (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`).

### Step 3 — Compile Anchor programs

```bash
anchor build
```

This produces the IDL and `.so` binaries inside `target/`.

### Step 4 — Start Surfpool cluster

In a **dedicated terminal**, keep this running:

```bash
surfpool start --no-tui -y
```

### Step 5 — Deploy programs to Surfpool

```bash
surfpool run deployment -u --env localnet
```

This runs the runbook at `runbooks/deployment/main.tx`, deploying both `vault` and `mock_swap` instantly via Surfpool cheatcodes. After this, both programs exist on your local fork at their canonical program IDs.

### Step 6 — Initialise the on-chain Config PDA

This registers the keeper authority and the allowed PreStocks mints on-chain. It auto-detects the mainnet USDC mint when pointing to Surfpool:

```bash
pnpm init-cluster
```

Expected output:
```
🌙 Moonjar Cluster Config Initializer
Solana RPC: http://127.0.0.1:8899
Config PDA: <address>
Match Pool PDA: <address>
⚡ Initializing Global Config on-chain...
🎉 Global Config successfully initialized! Tx: <signature>
```

> If you see `✅ Config already initialized on cluster.` — you're good, no action needed.

### Step 7 — Fund your wallet with SOL + USDC

The `pnpm fund` script uses Surfpool's `surfnet_setTokenAccount` cheatcode to instantly set token balances without a real faucet. **This only works on Surfpool localnet.**

```bash
pnpm fund <YOUR_SOLANA_WALLET_ADDRESS> 500

# Example (replace with your Privy embedded wallet address):
pnpm fund BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57 500
```

This gives the wallet 5 SOL (for gas) and $500 USDC.

### Step 8 — Run the web app and keeper

```bash
# Run both simultaneously:
pnpm dev

# Or individually:
pnpm dev:web      # Next.js on http://localhost:3000
pnpm dev:keeper   # Keeper daemon (polls every 30s)
```

Open [http://localhost:3000](http://localhost:3000). Log in via Privy, create a child vault, and the keeper will automatically evaluate PreStock valuations every 30 seconds.

---

## 🟡 Option B — Devnet

Use this when you want to test without Surfpool and don't need live Jupiter swap execution.

> **Important**: Real PreStock Token-2022 mints and their AMM liquidity pools (Meteora DLMM, Raydium) only exist on **Mainnet**. On Devnet the keeper's Jupiter quote call will return no routes, so it will skip buys with `No swap route available`. The web app, vault creation, deposits, and withdrawals all work normally — only keeper swap execution won't produce real trades.

### Step 1 — Configure environment for devnet

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com

NEXT_PUBLIC_VAULT_PROGRAM_ID=8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno

NEXT_PUBLIC_PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_SECRET=<your_privy_app_secret>
KEEPER_API_SECRET=your_secret_here
```

### Step 2 — Deploy programs to devnet

The same program IDs used on localnet are also registered for devnet in `Anchor.toml`:

```toml
[programs.devnet]
vault    = "8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno"
mock_swap = "C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE"
```

Deploy with:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Step 3 — Initialise Config PDA on devnet

`init-cluster.ts` detects `devnet` in the RPC URL and automatically switches to the Devnet USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`):

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com pnpm init-cluster
```

### Step 4 — Airdrop SOL (devnet)

Use the standard Solana CLI or faucet. `pnpm fund` **only works with Surfpool localnet** (it relies on `surfnet_setTokenAccount`):

```bash
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

For devnet USDC, use the [Circle devnet faucet](https://faucet.circle.com/).

### Step 5 — Run the app

```bash
pnpm dev
```

---

## 🔬 Option C — Offline Unit Tests (anchor test)

The Anchor test suite in `tests/vault.ts` runs against a blank `solana-test-validator` spun up automatically by `anchor test`. Because there is no mainnet fork and no Jupiter liquidity, it uses the `mock_swap` program as a CPI swap target instead.

```bash
anchor test
```

`mock_swap` is a minimal two-leg SPL token transfer program. It lets the tests verify all on-chain invariants (cost-basis caps, keeper auth, slippage guards, etc.) without needing internet or live DEX pools.

**You never need to manually deploy `mock_swap`** — `anchor test` compiles and deploys both programs to a fresh in-process test validator automatically.

---

## ⚙️ Environment Variables Reference

| Variable | Used by | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Web app | Your Privy App ID (get one at privy.io) |
| `PRIVY_APP_ID` | Web API routes | Same Privy App ID (server-side) |
| `PRIVY_APP_SECRET` | Web API routes | Privy App Secret for server-side verification |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Web app | `mainnet-beta` (for Surfpool) or `devnet` |
| `NEXT_PUBLIC_RPC_URL` | Web app | Solana RPC — `http://127.0.0.1:8899` (Surfpool) or `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_VAULT_PROGRAM_ID` | Web app | Always `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` |
| `SOLANA_RPC_URL` | Keeper + scripts | Same RPC but for server-side keeper and init scripts |
| `KEEPER_KEYPAIR_PATH` | Keeper | Path to keeper authority keypair (default: `~/.config/solana/id.json`) |
| `KEEPER_PRIVATE_KEY` | Keeper | Raw JSON keypair bytes (alternative to keypair file, useful for CI/Docker) |
| `FORCE_BUY` | Keeper | Set `true` to bypass the 10% premium guard (dev/testing only, disabled in production) |
| `KEEPER_API_SECRET` | Web API `/api/keeper` | Shared secret required in `x-keeper-secret` header to trigger the HTTP keeper endpoint |

---

## 🔒 Core Safety Invariants

| # | Invariant | Enforcement |
| :--- | :--- | :--- |
| 1 | **Cost-basis Moon Cap** | On-chain Anchor constraint: `moon_cost_basis + amount_in ≤ total_deposited × moon_cap_bps / 10000`. Default 20%, hard max 50% on-chain. |
| 2 | **10% Premium Ceiling** | Keeper computes `(jupiterExecutionPrice - markPrice) / markPrice × 100`. Rejects trade if > 10%. |
| 3 | **Slippage Guard** | On-chain: verifies `min_out ≥ quoted_out × (10000 - max_slippage_bps) / 10000`. |
| 4 | **Keeper-Only Execution** | `execute_buy` requires signer matches `config.keeper`. Non-keeper callers receive `NotKeeper` error. |
| 5 | **Guardian Withdrawals Always Open** | Pausing (`set_paused`) blocks keeper buys but never blocks guardian withdrawals. |
| 6 | **Allowed Mints Whitelist** | `create_vault` basket entries must all be in `config.allowed_mints`. Rejects `MintNotAllowed`. |
| 7 | **Wallet-Scoped Local State** | Browser storage keyed to `moonjar_vault_state_<guardianWallet>`. Old global key is purged on load. |

---

## 🧪 Testing

```bash
# Anchor on-chain integration tests (uses mock_swap, runs on test-validator):
anchor test

# Shared package unit tests (Zod schemas, linters, Flesch-Kincaid):
pnpm --filter @moonjar/shared test

# Next.js production build + TypeScript check:
pnpm --filter @moonjar/web build

# TypeScript check across all workspaces:
pnpm --recursive run build
```

---

## 📄 License

MIT © Moonjar Contributors
