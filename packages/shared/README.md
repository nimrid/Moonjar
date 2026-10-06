# 📦 Moonjar Shared Library (`@moonjar/shared`)

> Centralized TypeScript types, Zod schemas, PreStocks registry, and COPPA readability linters shared across `@moonjar/web`, `@moonjar/keeper`, and testing suites.

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Modules & Exports](#-modules--exports)
3. [PreStocks Asset Registry](#-prestocks-asset-registry)
4. [Child Safety Linters (Flesch-Kincaid & Banned Words)](#-child-safety-linters-flesch-kincaid--banned-words)
5. [Testing & Build](#-testing--build)

---

## 🔍 Overview

The `@moonjar/shared` workspace package ensures single-source-of-truth data contracts across the entire Moonjar monorepo:
- Guarantees identical type schemas between the web client and backend keeper bot.
- Maintains canonical Token-2022 mint addresses and metadata for supported private equities.
- Provides COPPA text linters to enforce age-appropriate reading levels across child-facing interfaces.

---

## 📁 Modules & Exports

| Module | File | Purpose |
| :--- | :--- | :--- |
| **`types.ts`** | [`src/types.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/types.ts) | Core interfaces and Zod validation schemas (`PreStockTokenSchema`, `ChildVaultMetadata`, `BuyDecisionLog`, `KidRequest`, `VaultAllocations`, etc.) |
| **`prestocks.ts`** | [`src/prestocks.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/prestocks.ts) | Canonical PreStocks registry (`PRESTOCKS_LIST`), dynamic cluster presets (`getBasketPresets`), dual-mint resolution (`getPreStockMint`, `findPreStockToken`), and premium calculators |
| **`devnet-prestocks.json`** | [`src/devnet-prestocks.json`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/devnet-prestocks.json) | Generated SPL token mint addresses for the 7 mock PreStock tokens deployed to Solana Devnet |
| **`flesch-kincaid.ts`** | [`src/flesch-kincaid.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/flesch-kincaid.ts) | Flesch-Kincaid grade level and reading ease scoring utilities |
| **`banned-words.ts`** | [`src/banned-words.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/banned-words.ts) | Linter preventing adult financial jargon, gambling terminology, or high-pressure language in kid copy |
| **`copy/`** | [`src/copy/`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/copy) | Curated company educational stories for *Little Explorer* (Grades 1-4) and *Future Founder* (Grades 5-10) |

---

## 🪙 PreStocks Asset Registry & Cluster-Aware Mints

The package provides single-source-of-truth metadata for supported private equities and handles dual-network mint resolution:

```typescript
import {
  PRESTOCKS_LIST,
  getBasketPresets,
  getPreStockMint,
  findPreStockToken,
  calculatePremiumPct,
  getPriceCheck
} from '@moonjar/shared';

// 1. Get cluster-aware presets (Devnet SPL mints vs Mainnet Token-2022 mints)
const presets = getBasketPresets(isDevnet);

// 2. Resolve specific token mint for active cluster
const spacexMint = getPreStockMint('SPACEX', isDevnet);

// 3. Resolve metadata from any mint (devnet or mainnet) or symbol
const tokenMeta = findPreStockToken(candidateMintAddress, liveTokens);

// 4. Calculate secondary market premium over mark valuation
const premiumPct = calculatePremiumPct(effectiveExecutionPrice, markValuationPrice);
const priceCheck = getPriceCheck(premiumPct);
```

---

## 🛡️ Child Safety Linters (Flesch-Kincaid & Banned Words)

Moonjar strictly avoids exposing children to predatory or complex financial phrasing:

- **Flesch-Kincaid Reading Level**: Enforces grade-level bounds ($< 4.0$ for Little Explorer, $< 8.0$ for Future Founder).
- **Banned Words Linter**: Flags words like *leverage*, *liquidation*, *fomo*, *moonshot*, *margin*, *risk-free*, etc.

---

## 🧪 Testing & Build

```bash
# Run unit tests with Vitest:
pnpm --filter @moonjar/shared test

# Typecheck TypeScript definitions:
pnpm --filter @moonjar/shared build
```
