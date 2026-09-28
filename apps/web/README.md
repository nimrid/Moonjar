# 🌐 Moonjar Web Application (`@moonjar/web`)

> The Next.js 14 web application powering both the **Guardian Suite** and the **Child Experience** for Moonjar.

[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-000000?logo=next.js)](https://nextjs.org/)
[![Privy Embedded Wallets](https://img.shields.io/badge/Privy-Embedded_Wallets-512DA8)](https://privy.io)
[![Pure Typesafe Client](https://img.shields.io/badge/Client-Pattern_2_Pure_Web3-3178C6)](./src/lib/vault-client/)
[![Bundle Size](https://img.shields.io/badge/Bundle-89.8_kB_Shared_JS-success)](https://nextjs.org)

---

## 📖 Table of Contents

1. [Features & Architecture](#-features--architecture)
2. [Routes & Page Directory](#-routes--page-directory)
3. [Environment Configuration](#-environment-configuration)
4. [Quickstart & Development](#-quickstart--development)
5. [Pure Typesafe Web3 Client (Pattern 2)](#-pure-typesafe-web3-client-pattern-2)
6. [Data Isolation & State Model](#-data-isolation--state-model)

---

## 🚀 Features & Architecture

### 1. Privy Embedded Solana Wallets
- **Zero Extension Requirement**: Parents sign up with email or social accounts without needing Phantom or Solflare browser extensions.
- **Self-Custody**: The parent retains exclusive custody while enjoying a frictionless web2-style onboarding experience.
- **In-App Transfers & Deposits**: Integrated `WalletTransferModal` allows seamless funding of the Child Save Jar or transfers between external wallets.

### 2. Dual-Mode Interface
- **Guardian Suite (`/guardian/*`)**: Analytical cockpit for parents to configure asset baskets, safety caps, review algorithmic keeper decisions, and simulate round-ups.
- **Child Portal (`/k/[token]` & `/k/demo`)**: Playful, calm, and distraction-free savings portal for kids with tactile jars, mascots, quizzes, and compound growth simulations.
- **One-Click Mode Switcher**: Quick switching in both directions between Parent Mode and Kid View.

---

## 🗺️ Routes & Page Directory

### 👨‍👩‍👧 Guardian Suite (`/guardian`)
| Route | Purpose | Key Components |
| :--- | :--- | :--- |
| **`/guardian/dashboard`** | Central command center | Dual Jar liquid gauges, asset allocation donuts, live keeper feed, direct deposit modal |
| **`/guardian/onboarding`** | 3-step vault setup | Child profile, animal avatar selector, COPPA compliance checklist, on-chain initialization |
| **`/guardian/baskets`** | PreStock risk & allocation manager | Preset baskets (Frontier Tech, AI Frontier, Future Truth), weight sliders, Moon cap limiters |
| **`/guardian/decisions`** | Algorithmic audit trail | Complete history of keeper buy and skip decisions with mathematical reasons and human explanations |
| **`/guardian/roundups`** | Spare change savings simulator | Interactive card swipe simulation, 1x/2x/5x multipliers, weekly budget ceilings |

### 🧒 Child Experience (`/k/[token]`)
| Route | Purpose | Key Components |
| :--- | :--- | :--- |
| **`/k/[token]`** | Child home page | Bouncy tactile Save and Moon jars, Pip mascot with 5 moods, recent achievements, request chips |
| **`/k/demo`** | Instant visitor preview | Full working interactive preview with pre-populated demo balances and lessons |
| **`/k/[token]/moon`** | Moon Jar deep dive | Detailed private equity holdings (SpaceX, OpenAI, etc.) and Pip's Money Academy quizzes |
| **`/k/[token]/company/[symbol]`** | Interactive company stories | Narrative company profiles with *Little Explorer* (Ages 6-9) vs *Future Founder* (Ages 10-17) reading level toggle |
| **`/k/[token]/garden`** | Compound interest garden | Visual growing flower tree with interactive watering can and 1-8 year horizon growth calculator |

---

## ⚙️ Environment Configuration

Create a `.env.local` file inside `apps/web/`:

```env
# Privy Embedded Wallet Credentials
NEXT_PUBLIC_PRIVY_APP_ID=cmudhs25n004d0bl62a2o8z2j
PRIVY_APP_ID=cmudhs25n004d0bl62a2o8z2j
PRIVY_APP_SECRET=privy_app_secret_...

# Solana RPC Connection (Surfpool local mainnet fork or devnet)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
NEXT_PUBLIC_VAULT_PROGRAM_ID=8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno
```

---

## 🛠️ Quickstart & Development

```bash
# Install dependencies from monorepo root:
pnpm install

# Start Next.js development server:
pnpm dev:web

# Run production build and type checking:
pnpm --filter @moonjar/web build

# Run ESLint:
pnpm --filter @moonjar/web lint
```

The application will be live at [http://localhost:3000](http://localhost:3000).

---

## ⚡ Pure Typesafe Web3 Client (Pattern 2)

To keep the web application light, fast, and mobile-friendly, Moonjar eliminated `@coral-xyz/anchor` and raw 45 KB IDL JSON files from the browser bundle:

- Located in [`src/lib/vault-client/`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/lib/vault-client/):
  - **`instructions.ts`**: Pure `@solana/web3.js` instruction builders using standard `TransactionInstruction` objects.
  - **`accounts.ts`**: Zero-dependency Borsh slice deserializers (`decodeChildVault`) with base58 discriminator filtering.
  - **`pda.ts`**: Deterministic PDA derivation for `ChildVault`, `Config`, and `MatchPool`.
- **Performance Impact**: Shared first-load JavaScript decreased from **~922 kB down to 89.8 kB (~90% reduction)**, ensuring instant mobile page loads on cellular connections.

---

## 🔐 Data Isolation & State Model

Moonjar enforces strict client-side data isolation:
- Vault state is scoped by guardian wallet address: `moonjar_vault_state_<guardianWallet>`.
- Decision audit logs are filtered strictly by `vaultAddress` to avoid cross-wallet contamination.
- Token-based lookup (`getStoredVaultByToken`) allows child sessions to retrieve their dedicated vault without requiring wallet connection.
- A built-in fallback to `DEMO_VAULT` ensures that visitors exploring `/k/demo` always experience a rich, responsive interface.
