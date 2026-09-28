# 🚀 MoonJar Surfpool Runbooks

> Declarative Crypto Infrastructure as Code (IaC) for local development, instant cheatcode program deployments, and on-demand Solana mainnet forking.

[![Surfpool](https://img.shields.io/badge/Operated%20with-Surfpool-green?logo=solana&logoColor=white)](https://surfpool.run)

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Program IDs & Artifacts](#-program-ids--artifacts)
3. [Deployment Runbook (`deployment/main.tx`)](#-deployment-runbook-deploymentmaintx)
4. [Step-by-Step Setup Guide](#-step-by-step-setup-guide)
5. [Useful Surfpool Commands](#-useful-surfpool-commands)
6. [Why Surfpool for MoonJar?](#-why-surfpool-for-moonjar)

---

## 🛠️ Overview

Moonjar relies on **Surfpool** to automate program compilation, deployment, and test account provisioning. Surfpool forks Solana mainnet on-demand, caching mainnet Token-2022 mints and liquidity pools locally so that integration tests run against realistic blockchain state without incurring real gas costs.

---

## 📦 Program IDs & Artifacts

The current Anchor programs configured in `Anchor.toml` and deployed by the runbook:

| Program | Program ID | Description |
| :--- | :--- | :--- |
| **`vault`** | `8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno` | Core MoonJar child vault program (PDA accounts, cost-basis invariants, Jupiter CPI) |
| **`mock_swap`** | `C8cAUowrquZVNxH8PpToSkzzr74fC7uorZ4VPzFgNLAE` | Offline swap test harness for deterministic unit tests |

---

## 📄 Deployment Runbook (`deployment/main.tx`)

Located at [`runbooks/deployment/main.tx`](file:///Users/hng/Documents/antigravity/MoonJar/runbooks/deployment/main.tx):

```hcl
addon "svm" {
    rpc_api_url = input.rpc_api_url
    network_id = input.network_id
}

action "deploy_mock_swap" "svm::deploy_program" {
    description = "Deploy mock_swap program"
    program = svm::get_program_from_anchor_project("mock_swap") 
    authority = signer.authority
    payer = signer.payer
    instant_surfnet_deployment = true
}

action "deploy_vault" "svm::deploy_program" {
    description = "Deploy vault program"
    program = svm::get_program_from_anchor_project("vault") 
    authority = signer.authority
    payer = signer.payer
    instant_surfnet_deployment = true
}
```

Both actions use `instant_surfnet_deployment = true` to write program bytecode directly to the cluster accounts via Surfpool cheatcodes, completing deployments in milliseconds.

---

## 🚀 Step-by-Step Setup Guide

### 1. Launch the Local Surfpool Cluster
In a dedicated terminal window:
```bash
surfpool start --no-tui -y
```

### 2. Deploy Anchor Programs via Runbook
```bash
surfpool run deployment -u --env localnet
```

### 3. Initialize Global On-Chain Config
Register the keeper authority and allowed PreStocks mints on-chain:
```bash
pnpm init-cluster
```

### 4. Fund Any Wallet with SOL & USDC
Airdrop 5 SOL and set test USDC token balance via Surfpool cheatcodes:
```bash
pnpm fund <SOLANA_WALLET_ADDRESS> [USDC_AMOUNT]

# Example:
pnpm fund BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57 500
```

---

## ⌨️ Useful Surfpool Commands

```bash
# List available runbooks:
surfpool ls

# Execute deployment on localnet:
surfpool run deployment -u --env localnet

# Watch mode (automatically redeploys upon recompilation):
surfpool start --watch
```

---

## 💡 Why Surfpool for MoonJar?

1. **On-Demand Mainnet Forking**: MoonJar's Keeper interacts with real live Jupiter V6 swap aggregators, Meteora DLMM pools, and Token-2022 PreStocks mints. Surfpool fetches and caches mainnet accounts on-demand, allowing end-to-end integration testing without paying real mainnet gas.
2. **Deterministic Infrastructure as Code**: Runbooks eliminate fragile bash deployment scripts, ensuring reproducible environments across all developer machines and CI runners.
3. **Cheatcode State Provisioning**: `surfnet_setTokenAccount` allows instant provisioning of any token balance without manual faucet rate limits.
