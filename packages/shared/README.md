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
| **`types.ts`** | [`src/types.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/types.ts) | Core interfaces and Zod validation schemas (`ChildVaultMetadata`, `BuyDecisionLog`, `KidRequest`, `VaultAllocations`, etc.) |
| **`prestocks.ts`** | [`src/prestocks.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/prestocks.ts) | Canonical PreStocks registry (`PRESTOCKS_LIST`), default basket presets (`BASKET_PRESETS`), and premium percentage calculators |
| **`flesch-kincaid.ts`** | [`src/flesch-kincaid.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/flesch-kincaid.ts) | Flesch-Kincaid grade level and reading ease scoring utilities |
| **`banned-words.ts`** | [`src/banned-words.ts`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/banned-words.ts) | Linter preventing adult financial jargon, gambling terminology, or high-pressure language in kid copy |
| **`copy/`** | [`src/copy/`](file:///Users/hng/Documents/antigravity/MoonJar/packages/shared/src/copy) | Curated company educational stories for *Little Explorer* (Grades 1-4) and *Future Founder* (Grades 5-10) |

---

## 🪙 PreStocks Asset Registry

The package exports `PRESTOCKS_LIST`, defining each private company token:

```typescript
import { PRESTOCKS_LIST, BASKET_PRESETS, calculatePremiumPct } from '@moonjar/shared';

// Calculate secondary market premium over mark valuation
const premiumPct = calculatePremiumPct(effectiveExecutionPrice, markValuationPrice);
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
