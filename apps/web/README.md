# 🌐 Moonjar Web Application (`@moonjar/web`)

> Next.js 14 app powering the Guardian Suite and Child Portal. Connects to Solana via Privy embedded wallets and a zero-Anchor pure typesafe client.

---

## Running Locally

```bash
# From monorepo root:
pnpm dev:web          # http://localhost:3000
```

See the root README for full setup (Surfpool / devnet / env vars).

---

## Environment Configuration

Switch environments instantly from the monorepo root:

```bash
pnpm env:devnet     # Switch to Solana Devnet 🟡
pnpm env:localnet   # Switch to Surfpool Localnet 🟢
```

Or manually configure `apps/web/.env.local`:

```env
# Privy (get yours at https://privy.io)
NEXT_PUBLIC_PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_ID=<your_privy_app_id>
PRIVY_APP_SECRET=<your_privy_app_secret>

# Solana RPC
# For Surfpool localnet:
# NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
# NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
# NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# For Devnet:
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Program ID (same on localnet and devnet)
NEXT_PUBLIC_VAULT_PROGRAM_ID=8Xi2Ty3i2VMsi4JauYrHoyyBcKoaBdMcLHEtZb6bHMno

# HTTP keeper endpoint secret
KEEPER_API_SECRET=your_secret_here
```

### Cluster-Aware Mint Derivation

- **USDC Mint:** The app uses [`ACTIVE_USDC_MINT`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/lib/onchain.ts), which dynamically selects Circle Devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) on Devnet and Mainnet USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) on Surfpool / Mainnet.
- **PreStock Mints:** When onboarding a child or modifying basket allocations, the web app calls `getBasketPresets(isDevnet)` and `getPreStockMint(symbol, isDevnet)` to ensure on-chain vaults store cluster-valid mint accounts (`9Qz3Lg...`, `7WaJ2s...` on devnet vs `PreANx...`, `Pren1F...` on mainnet).

---

## Routes

### Guardian Suite (`/guardian`)

| Route | What it does |
| :--- | :--- |
| `/guardian/dashboard` | Main control panel — dual jar gauges, live on-chain balances, keeper decision feed, deposit/pause/transfer |
| `/guardian/onboarding` | 3-step vault setup: child profile + avatar, COPPA consent, on-chain `create_vault` + initial deposit |
| `/guardian/baskets` | PreStock basket allocation sliders and Moon cap adjuster |
| `/guardian/decisions` | Complete audit log of keeper buy/skip decisions |
| `/guardian/roundups` | Interactive round-up simulator (1×/2×/5× multiplier, weekly cap) |

### Child Portal (`/k/[token]`)

| Route | What it does |
| :--- | :--- |
| `/k/demo` | Live preview — always loads `DEMO_VAULT` fallback data. No wallet needed. |
| `/k/[token]` | Child's home — bouncy Save Jar + Moon Jar, Pip mascot, request chips |
| `/k/[token]/moon` | Moon Jar breakdown — holdings per company, Pip's Money Academy quizzes |
| `/k/[token]/company/[symbol]` | Company story page — dual reading level toggle (Little Explorer / Future Founder) |
| `/k/[token]/garden` | Compound interest flower garden with 1–8 year growth calculator |

### API Routes

| Route | Auth | What it does |
| :--- | :--- | :--- |
| `POST /api/keeper` | `x-keeper-secret` header | Triggers one keeper evaluation for a specific `vaultAddress` |
| `GET /api/prestocks` | None | Proxies `prestocks.com/api/prestocks` (30s cache). Falls back to `PRESTOCKS_LIST` if upstream is down. |
| `POST /api/deposit` | None | Helper endpoint for deposit flow |

---

## Architecture Notes

### Pure Typesafe Solana Client (Pattern 2)

Located in [`src/lib/vault-client/`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/lib/vault-client/):

- **`constants.ts`**: Program ID, USDC mint (network-aware), Anchor discriminators
- **`instructions.ts`**: Pure `@solana/web3.js` instruction builders — no Anchor runtime in the browser
- **`accounts.ts`**: Borsh offset-slice deserializers (`decodeChildVault`, `fetchAllChildVaults`) — no IDL JSON needed
- **`pda.ts`**: PDA derivation for `ChildVault`, `Config`, `MatchPool`

This eliminates `@coral-xyz/anchor` from the browser bundle, reducing shared first-load JS from ~922 kB to **89.8 kB**.

### Vault State (Local Storage)

[`src/lib/store.ts`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/lib/store.ts) manages the vault cache in `localStorage`:

- Scoped per wallet: `moonjar_vault_state_<guardianWallet>`
- Token-to-wallet index: `moonjar_vault_token_<capabilityToken>` → wallet address
- Last active wallet: `moonjar_last_guardian_wallet`
- Child pages load vault via `getStoredVaultByToken(token)` — no wallet connection required
- Falls back to `DEMO_VAULT` for `/k/demo` visitors

### Privy Embedded Wallets

[`src/components/providers/PrivySolanaProvider.tsx`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/components/providers/PrivySolanaProvider.tsx) exposes:

- `createVault()` — signs and sends `create_vault` instruction + optional initial deposit
- `depositToVault()` — USDC transfer to vault Save Jar ATA
- `transferTokens()` — USDC or SOL transfer to any address
- `updateVaultSettings()` — signs `set_caps` and `set_basket` instructions

---

## Build and Lint

```bash
pnpm --filter @moonjar/web build   # Production build + TypeScript check
pnpm --filter @moonjar/web lint    # ESLint
pnpm --filter @moonjar/web start   # Production server (after build)
```
