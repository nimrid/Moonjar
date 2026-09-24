# 🚀 MoonJar Surfpool Runbooks

[![Surfpool](https://img.shields.io/badge/Operated%20with-Surfpool-green?logo=solana&logoColor=white)](https://surfpool.run)

MoonJar uses **Surfpool** for local infrastructure-as-code management, mainnet forking, and automated program deployments.

---

## Available Runbooks

### `deployment` ([`runbooks/deployment/main.tx`](file:///Users/hng/Documents/antigravity/MoonJar/runbooks/deployment/main.tx))
Deploys MoonJar's on-chain programs to the local Surfpool cluster:
- **`vault`**: The core MoonJar ChildVault program (`hVSAPTYZCboWUcmzGcAJkC8jLSWcmJ4VtBjNpW4DmWT`).
- **`mock_swap`**: Offline swap test harness for deterministic Anchor unit tests (`6JBe6PqaEGGWgmcSiCMptyLvhekA8uyuvKNXuwNZktsJ`).

Both actions use `instant_surfnet_deployment = true`, writing program binary bytecode directly via Surfpool cheatcodes for instantaneous sub-second deployments.

---

## Quickstart

### 1. Launch Local Surfnet (Solana Mainnet Fork)
In a dedicated terminal:
```bash
surfpool start --no-tui -y
```

### 2. Execute Deployment Runbook
Deploy the compiled Anchor programs to your local Surfpool cluster:
```bash
surfpool run deployment -u --env localnet
```

### 3. Initialize Global On-Chain Config
Register the keeper authority and allowed PreStocks mints on-chain:
```bash
pnpm init-cluster
```

### 4. Fund Any Wallet via Cheatcode
Airdrop 5 SOL and provision test USDC to any Solana wallet:
```bash
pnpm fund <SOLANA_WALLET_ADDRESS> [USDC_AMOUNT]

# Example:
pnpm fund BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57 500
```

---

## Runbook Syntax & Commands

```bash
# List all runbooks in this repository:
surfpool ls

# Execute deployment runbook on localnet:
surfpool run deployment -u --env localnet

# Watch mode: automatically redeploy programs upon recompilation:
surfpool start --watch
```

---

## Why Surfpool for MoonJar?

1. **On-Demand Mainnet Forking**: MoonJar's Keeper interacts with real live Jupiter V6 swap aggregators, Meteora DLMM pools, and Token-2022 PreStocks mints. Surfpool fetches and caches mainnet accounts on-demand, allowing end-to-end integration testing without paying real mainnet gas.
2. **Deterministic Infrastructure as Code**: Runbooks eliminate fragile bash deployment scripts, ensuring reproducible environments across all developer machines and CI runners.
3. **Cheatcode State Provisioning**: `surfnet_setTokenAccount` allows instant provisioning of any token balance without manual faucet rate limits.
