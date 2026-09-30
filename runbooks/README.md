# 🚀 MoonJar Surfpool Runbooks

> Infrastructure-as-Code for instant on-demand Solana program deployment to a local mainnet fork.

[![Surfpool](https://img.shields.io/badge/Operated%20with-Surfpool-green?logo=solana&logoColor=white)](https://surfpool.run)

---

## What Surfpool Does for Moonjar

Surfpool runs a local Solana node at `http://127.0.0.1:8899` that **forks Solana mainnet on demand**. When the keeper or web app requests mainnet accounts (Jupiter program, PreStock mint accounts, AMM pool state), Surfpool fetches them live from mainnet and caches them locally. This lets you:

- Run real Jupiter V6 swap quotes and execute CPI swaps against real liquidity
- Use the real Circle USDC mint (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- Use real PreStock Token-2022 mints (SpaceX, OpenAI, etc.)
- Provision test balances instantly via cheatcodes (no faucet needed)

All without spending real money or needing a mainnet wallet with funds.

---

## Programs Deployed

The deployment runbook deploys **both** programs to the local fork:

| Program | Program ID |
| :--- | :--- |
| `vault` | `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` |
| `mock_swap` | `C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE` |

`mock_swap` is deployed as part of the runbook but is **only ever called** from `tests/vault.ts`. The keeper and web app exclusively use Jupiter.

---

## Step-by-Step Usage

### 1. Start Surfpool cluster (keep this terminal open)

```bash
surfpool start --no-tui -y
```

This starts the local Solana fork at `http://127.0.0.1:8899`. Keep it running in its own terminal throughout development.

### 2. Deploy programs

```bash
surfpool run deployment -u --env localnet
```

Uses `instant_surfnet_deployment = true` in the runbook — writes program bytecode directly via cheatcode. Completes in milliseconds.

### 3. Initialise on-chain Config PDA

Only needed once (or after resetting the ledger):

```bash
pnpm init-cluster
```

This sets up the keeper authority and registers the 7 allowed PreStock mints in the vault program's Config account.

### 4. Fund any wallet

```bash
pnpm fund <WALLET_ADDRESS> [USDC_AMOUNT]

# Example:
pnpm fund BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57 500
```

- Airdrops 5 SOL via `requestAirdrop`
- Sets USDC token account balance via `surfnet_setTokenAccount` cheatcode

> This script only works against Surfpool localnet. It does not work on devnet or mainnet.

---

## Runbook Syntax Reference

```bash
# List all available runbooks:
surfpool ls

# Execute deployment on localnet (with latest compiled artifacts):
surfpool run deployment -u --env localnet

# Watch mode — auto-redeploys when program .so files change:
surfpool start --watch
```

---

## Why Not Use anchor deploy for Local Development?

`anchor deploy` sends real transactions to upload program data. For large programs this is slow and requires significant SOL for rent. Surfpool's `instant_surfnet_deployment = true` bypasses this by writing bytecode directly to the cluster state — making redeploys instant during development.

For **devnet** deployment, use `anchor deploy --provider.cluster devnet` instead (see the root README).
