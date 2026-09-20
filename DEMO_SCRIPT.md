# Moonjar Demo & Showcase Walkthrough

Welcome to **Moonjar** — a family savings app for kids, powered by PreStocks on Solana.

Moonjar solves a deep problem: teaching children responsible, patient wealth-building by separating savings into two distinct on-chain jars:
1. **The Save Jar**: Rock-solid, stable digital dollars (USDC) earning calm yield.
2. **The Moon Jar**: Hard-capped (default 20%, maximum 50% on-chain) exposure to tokenized private equity pioneers (SpaceX, OpenAI, Anthropic, Anduril, Figure AI, etc.) via PreStocks.

---

## Quick Start (How to Run)

To run both the Next.js web application and the autonomous Keeper service:

```bash
# 1. Install dependencies (if not already done)
pnpm install

# 2. Run both Web App and Keeper Daemon concurrently:
pnpm dev

# Or run separately in two terminals:
# Terminal 1: Web Frontend
pnpm dev:web

# Terminal 2: Valuation Keeper Daemon
pnpm dev:keeper
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 13-Step Guided Tour of All Flows

### Flow 1: Landing Page (`/`)
- **What to look for**: The "soft sticker" aesthetic with 3px ink borders, warm palette (`#FAF8F5`), custom SVG mascot **Pip**, and clear entry points.
- **Actions**:
  - Click **"Open Guardian Dashboard"** or **"Explore Kid View"**.
  - Review the 3 core pillars: Dual Jars, 20% Hard Cap Invariant, and COPPA Child Privacy.

### Flow 2: Guardian Dashboard (`/guardian/dashboard`)
- **What to look for**:
  - Dual Jar progress visualizations with animated SVG liquid levels.
  - **The Cost-Basis Cap Gauge**: Demonstrates that Moonjar tracks cost basis (not paper gains) so market run-ups never trigger forced sales.
  - Emergency Pause toggle (freezes buys instantly while preserving independent withdrawal rights).
  - Quick Manual Deposit modal (simulating a deposit on Solana devnet).
  - **"Simulate Keeper Run"** button: Watch the keeper evaluate prices and post live decisions to the feed.
  - Pending Kid Requests with instant "Approve & Reward" buttons.

### Flow 3: Basket & Cap Management (`/guardian/baskets`)
- **What to look for**:
  - Preset baskets: **Frontier Tech** (SpaceX, Anduril, Figure AI), **AI Frontier** (Anthropic, OpenAI), **Future Truth** (Kalshi, Polymarket).
  - Interactive allocation sliders: Enforces exactly 100% total allocation.
  - Cost-Basis Cap Slider: Visual slider from 5% to 50% (capped at 50% by smart contract).

### Flow 4: Keeper Decision Audit Log (`/guardian/decisions`)
- **What to look for**:
  - Complete algorithmic audit trail of every buy, skip, and cap enforcement.
  - Filter by **"All"**, **"Buys Only"**, or **"Skips Only"**.
  - Click on any decision to open the **Decision Breakdown Modal**:
    - **Machine Reason**: e.g., `PREMIUM_TOO_HIGH (15.6% > 10.0%)`.
    - **Guardian Explanation**: Plain English rationale.
    - **What Pip Told The Kid**: Gentle, encouraging explanation ("Pip is being patient today!").
    - Solana Devnet transaction signature link.

### Flow 5: Gift Links & Family Match Pool (`/guardian/gifts`)
- **What to look for**:
  - Generate custom shareable gift links (e.g., `/gift/leo-birthday`).
  - **Family Sponsor Match Pool**: On-chain match pool where guardians or grandparents deposit USDC to match child savings (e.g. 50% match).
  - Gift history feed with attached emoji stickers and notes.

### Flow 6: Spare Change Round-ups (`/guardian/roundups`)
- **What to look for**:
  - Turn daily purchases into savings.
  - Configurable multipliers (1x, 2x, 3x) and weekly caps ($25/week).
  - Click **"Simulate Card Swipe"** to watch coffee ($4.65 -> +$0.35) get swept directly into the Save Jar in real time.

### Flow 7: Kid Link & Tablet Setup (`/guardian/kid-link`)
- **What to look for**:
  - High-resolution printable QR code for scanning on iPad or Android tablets.
  - Capability URL (`/k/demo-token`).
  - COPPA compliance overview: Zero seed phrases, zero ad trackers, anonymous hashed nicknames, self-hosted fonts only.

### Flow 8: Kid App Home (`/k/demo-token`)
- **What to look for**:
  - Animal avatar (Otter 🦦) and Pip greetings.
  - **Snapshot from earlier today**: Prevents ticker-checking anxiety and dopamine addiction.
  - **Dual Tactile Jars**: Tap either jar to hear the coins bounce and trigger festive confetti bursts!

### Flow 9: Inside the Moon Jar (`/k/demo-token/moon`)
- **What to look for**:
  - Visual cards for all 8 PreStocks companies.
  - "In Your Jar" vs "In Wishlist" badges.
  - Clear explanation of private equity in kid language.
  - Click **"Read Story"** on SpaceX, OpenAI, Anduril, or Figure AI.

### Flow 10: Age-Adapted Company Storytelling (`/k/demo-token/company/spacex`)
- **What to look for**:
  - **Reading Level Toggle**: Switch between **🌟 Explorer (Ages 8-11)** and **🚀 Builder (Ages 12-14)**.
  - Pip's Fun Fact (e.g. Mechazilla chopsticks catching rockets in mid-air).
  - Calm weather analogy: "Why do prices change like the weather?"
  - **Interactive Curiosity Check**: Answer a question to test understanding and trigger confetti!

### Flow 11: The Compound Interest Garden (`/k/demo-token/garden`)
- **What to look for**:
  - Interactive "water drop" slider: Set weekly savings ($1 to $25).
  - Time horizon buttons: 1 Year, 3 Years, 5 Years, Graduation (18).
  - Visual tree evolves from a tiny sprout 🌱 to a blooming sapling 🌿, a fruit tree 🌳, and a grand ancient oak 🌲!
  - Click **"Water the Garden!"** to sprinkle drops.
  - Prominent educational disclaimer banner.

### Flow 12: Pip's Money Academy (`/k/demo-token/learn`)
- **What to look for**:
  - 6 bite-sized interactive lessons covering money history, dual jars, companies, volatility, patience, and graduation.
  - Take the 1-question quiz on each lesson.
  - Correct answers award collectible sticker badges to the **Sticker Album** at the top!

### Flow 13: Kid Requests (`/k/demo-token/ask`) & Graduation (`/k/demo-token/graduate`)
- **Ask Pip**: Send safe, pre-curated chore notes ("I cleaned my room! +$10") directly to the guardian.
- **Graduation**:
  - Countdown to 18th birthday.
  - **"Simulate 18th Birthday Unlock"**: Experience the graduation ceremony where training wheels are removed and self-custody keys are transferred.
  - **Printable Certificate**: Click "Print Commemorative Certificate" for a framed keepsake.

---

## Public Gift Page (`/gift/leo-birthday`)
- Accessible by relatives without any login or wallet required.
- Pick preset gift amounts ($10, $25, $50, $100).
- Live preview of 80% Save / 20% Moon split + Family Match Pool bonus (+50%).
- Attach emoji stickers (🚀, 🎂, 🌟) and heartfelt messages.
