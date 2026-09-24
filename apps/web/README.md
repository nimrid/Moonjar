# 🌐 Moonjar Web Application (`@moonjar/web`)

The Next.js 14 web application powering both the **Guardian Suite** and the **Child Experience** for Moonjar.

[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-000000?logo=next.js)](https://nextjs.org/)
[![Privy Embedded Wallets](https://img.shields.io/badge/Privy-Embedded_Wallets-512DA8)](https://privy.io)
[![Pure Typesafe Client](https://img.shields.io/badge/Client-Pattern_2_Pure_Web3-3178C6)](./src/lib/vault-client/)
[![Bundle Size](https://img.shields.io/badge/Bundle-89.8_kB_Shared_JS-success)](https://nextjs.org)

---

## Architecture Highlights

### 1. Privy Embedded Solana Wallets
- Replaces legacy third-party wallet extensions with self-custody embedded Solana wallets.
- Seamless email or social authentication with zero seed phrases required for parents.
- Integrated **Wallet Transfer Modal** ([`WalletTransferModal.tsx`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/components/guardian/WalletTransferModal.tsx)): Live on-chain balance display, direct Save Jar deposits, and external wallet transfers (USDC/SOL).

### 2. Pattern 2: Pure Typesafe Solana Client (Zero Anchor Runtime)
- Completely eliminates `@coral-xyz/anchor` and raw 45 KB IDL JSON (`vault.json`) from the browser bundle.
- Custom typesafe binary serializers and deserializers in [`src/lib/vault-client/`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/lib/vault-client/):
  - **`instructions.ts`**: Pure `@solana/web3.js` instruction builders (`createDepositInstruction`, `createCreateVaultInstruction`, `createExecuteBuyInstruction`).
  - **`accounts.ts`**: High-performance Borsh offset slice deserializer (`decodeChildVault`) with base58 discriminator filtering (`fetchAllChildVaults`).
  - **`pda.ts`**: Deterministic program-derived address utilities.
- **Results**: Slashed shared first-load JS from **~922 kB down to 89.8 kB (~90% reduction)**.

### 3. Strict Wallet & Vault Data Isolation
- Local state is strictly scoped to `moonjar_vault_state_<guardianWallet>`.
- The global un-scoped storage key is proactively purged on load.
- Decisions are strictly filtered by `d.vaultAddress === vault.metadata.vaultAddress` to guarantee zero cross-wallet leaks.

---

## Route Overview

### Guardian Suite (`/guardian`)
- **`/guardian/dashboard`**: Dual Jar visualizations, animated SVG liquid level gauges, cost-basis cap tracker, direct Save Jar deposit modal, wallet transfers, and live keeper activity feed.
- **`/guardian/onboarding`**: 3-step setup (Child profile, avatar selection, COPPA consent, on-chain vault creation signed by Privy embedded wallet).
- **`/guardian/baskets`**: PreStock preset baskets (Frontier Tech, AI Frontier, Future Truth), weight sliders (enforcing 100% total), and moon cap sliders.
- **`/guardian/decisions`**: Complete audit trail of algorithmic buy/skip decisions, valuation premium calculations, active vault badges, and "Clear Log" action.
- **`/guardian/roundups`**: Spare change transaction simulator with card swipe demo, round-up multipliers, and weekly caps.

### Child Experience (`/k/[token]`)
- **`/k/[token]`**: Tactile dual jars (Save Jar + Moon Jar), calm snapshot psychology, zero red numbers, and responsive SVG mascot **Pip** with 5 emotional states.
- **`/k/[token]/company/[symbol]`**: Rich company stories (SpaceX, OpenAI, etc.) with reading level toggle (Little Explorer vs. Future Founder).
- **`/k/[token]/garden`**: Compound interest flower garden that grows as the child saves.
- **`/k/[token]/moon`**: Pip's Money Academy with 6 interactive quizzes and digital badges.

---

## Environment Variables

Create `.env.local` inside `apps/web/`:

```env
# Privy App Configuration
NEXT_PUBLIC_PRIVY_APP_ID=cmudhs25n004d0bl62a2o8z2j
PRIVY_APP_ID=cmudhs25n004d0bl62a2o8z2j
PRIVY_APP_SECRET=privy_app_secret_...

# Solana RPC Connection (Local Surfpool Fork)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
```

---

## Development & Build Commands

```bash
# Start Next.js development server (http://localhost:3000)
pnpm dev:web

# Run ESLint validation
pnpm --filter @moonjar/web lint

# Run optimized production build
pnpm --filter @moonjar/web build

# Start production server
pnpm --filter @moonjar/web start
```
