# 🎬 Moonjar Demo & Showcase Walkthrough

Welcome to **Moonjar** — a family savings app for kids, powered by PreStocks on Solana.

Moonjar solves a deep problem: teaching children responsible, patient wealth-building by separating savings into two distinct on-chain jars:
1. **The Save Jar**: Rock-solid, stable digital dollars (USDC) earning calm yield.
2. **The Moon Jar**: Hard-capped (default 20%, maximum 50% on-chain) exposure to tokenized private equity pioneers (SpaceX, OpenAI, Anthropic, Anduril, Figure AI, etc.) via PreStocks.

---

## Quick Start (How to Run)

### 1. Launch the Local Surfpool Cluster
In a separate terminal, launch the local Surfpool mainnet fork:
```bash
surfpool start --no-tui -y
```

### 2. Deploy Programs & Initialize Cluster
```bash
# Deploy compiled Anchor programs instantaneously via cheatcodes:
surfpool run deployment -u --env localnet

# Initialize on-chain global config (Keeper authority & allowed PreStocks mints):
pnpm init-cluster
```

### 3. Start the Web App & Keeper Daemon
```bash
# Run both the Next.js frontend and the autonomous valuation keeper concurrently:
pnpm dev

# Or run separately:
# Terminal 1: Web App (http://localhost:3000)
pnpm dev:web

# Terminal 2: Valuation Keeper Daemon
pnpm dev:keeper
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 13-Step Guided Tour of All Flows

### Flow 1: Landing Page (`/`)
- **What to look for**: Soft sticker aesthetic with 3px ink borders, warm cream background (`#FAF8F5`), responsive SVG mascot **Pip**, and clear entry points.
- **Actions**:
  - Click **"Open Guardian Dashboard"** or **"Explore Kid View"**.
  - Review the 3 core pillars: Dual Jars, 20% Hard Cap Invariant, and COPPA Child Privacy.

### Flow 2: Privy Embedded Wallet Authentication & Funding
- **What to look for**:
  - In the Guardian Suite top bar, click **"Sign In with Privy"** (or use your connected embedded wallet).
  - Parents can authenticate via email or social login without writing down a 12-word seed phrase.
  - To fund your embedded wallet with test SOL and Circle USDC on Surfpool:
    ```bash
    pnpm fund <YOUR_PRIVY_WALLET_ADDRESS> 500
    ```
  - Open the **Wallet Transfer Modal** ([`WalletTransferModal.tsx`](file:///Users/hng/Documents/antigravity/MoonJar/apps/web/src/components/guardian/WalletTransferModal.tsx)) from the top navigation to view live on-chain USDC/SOL balances, make direct Save Jar deposits, or transfer funds to external wallets.

### Flow 3: Guardian Dashboard (`/guardian/dashboard`)
- **What to look for**:
  - Dual Jar progress visualizations with animated SVG liquid levels.
  - **The Cost-Basis Cap Gauge**: Demonstrates that Moonjar tracks cost basis (not paper gains) so market run-ups never trigger forced sales.
  - Emergency Pause toggle (freezes buys instantly while preserving independent withdrawal rights).
  - Quick Manual Deposit modal (deposits real USDC on-chain into the child vault PDA).
  - **"Run Check"** button: Triggers an on-chain evaluation cycle through the Keeper engine.
  - Pending Kid Requests with instant "Approve & Reward" buttons.

### Flow 4: Child Vault Creation & Onboarding (`/guardian/onboarding`)
- **What to look for**:
  - 3-step setup flow: Child nickname & avatar, safety caps & reading level selection, and on-chain initialization.
  - Generates the deterministic on-chain PDA `[b"vault", guardian, child_index]`.
  - Transaction is signed seamlessly by the guardian's Privy embedded wallet.

### Flow 5: Basket & Cap Management (`/guardian/baskets`)
- **What to look for**:
  - Preset baskets: **Frontier Tech** (SpaceX, Anduril, Figure AI), **AI Frontier** (Anthropic, OpenAI), **Future Truth** (Kalshi, Polymarket).
  - Interactive allocation sliders: Enforces exactly 100% total allocation.
  - Cost-Basis Cap Slider: Visual slider from 5% to 50% (enforced by on-chain smart contract invariants).

### Flow 6: Keeper Decision Audit Log (`/guardian/decisions`)
- **What to look for**:
  - Complete algorithmic audit trail of every buy, skip, and valuation check.
  - **The 10% Valuation Rule in Action**:
    - Click **"Evaluate Live PreStocks"**: Queries real Jupiter V6 quotes and compares execution pricing against fundamental Mark Price. If secondary markets are quoting at >10% premium, the keeper automatically rejects the trade (`PREMIUM_TOO_HIGH`), keeping funds safe in the Save Jar.
    - Click **"Force Buy"**: Bypasses the premium ceiling for testing to execute a live **Versioned Transaction (v0)** with Address Lookup Tables through Jupiter on Surfpool!
  - **Active Vault Badge**: Displays the exact active vault address and child nickname for complete audit clarity.
  - **"Clear Log"** button: Purges local evaluation logs with a single click.

### Flow 7: Spare Change Round-ups (`/guardian/roundups`)
- **What to look for**:
  - Turn everyday transactions into child savings.
  - Configurable multipliers (1x, 2x, 3x) and weekly caps ($25/week).
  - Click **"Simulate Card Swipe"** to watch a purchase ($4.65 -> +$0.35 round-up) sweep directly into the Save Jar in real time.

### Flow 8: Kid Link & Tablet Setup (`/guardian/kid-link`)
- **What to look for**:
  - High-resolution printable QR code for scanning on iPad or Android tablets.
  - Capability URL (`/k/demo-token`).
  - COPPA compliance overview: Zero seed phrases, zero ad trackers, anonymous hashed nicknames, self-hosted fonts only.

### Flow 9: Kid App Home (`/k/demo-token`)
- **What to look for**:
  - Animal avatar (Otter 🦦) and Pip mascot greetings.
  - **Snapshot from earlier today**: Prevents ticker-checking anxiety and dopamine addiction.
  - **Dual Tactile Jars**: Tap either jar to hear the coins bounce and trigger festive confetti bursts!

### Flow 10: Inside the Moon Jar (`/k/demo-token/moon`)
- **What to look for**:
  - Visual cards for all PreStocks companies.
  - "In Your Jar" vs "In Wishlist" badges.
  - Clear explanation of private equity in kid language.
  - Click **"Read Story"** on SpaceX, OpenAI, Anduril, or Figure AI.

### Flow 11: Age-Adapted Company Storytelling (`/k/demo-token/company/spacex`)
- **What to look for**:
  - **Reading Level Toggle**: Switch between **🌟 Explorer (Ages 8-11)** and **🚀 Builder (Ages 12-14)**.
  - Pip's Fun Fact (e.g. Mechazilla chopsticks catching rockets in mid-air).
  - Calm weather analogy: "Why do prices change like the weather?"
  - **Interactive Curiosity Check**: Answer a question to test understanding and trigger confetti!

### Flow 12: The Compound Interest Garden (`/k/demo-token/garden`)
- **What to look for**:
  - Interactive "water drop" slider: Set weekly savings ($1 to $25).
  - Time horizon buttons: 1 Year, 3 Years, 5 Years, Graduation (18).
  - Visual tree evolves from a tiny sprout 🌱 to a blooming sapling 🌿, a fruit tree 🌳, and a grand ancient oak 🌲!
  - Click **"Water the Garden!"** to sprinkle drops.
  - Prominent educational disclaimer banner.

### Flow 13: Pip's Money Academy (`/k/demo-token/learn`) & Graduation
- **What to look for**:
  - 6 bite-sized interactive lessons covering money history, dual jars, companies, volatility, patience, and graduation.
  - Take the 1-question quiz on each lesson.
  - Correct answers award collectible sticker badges to the **Sticker Album** at the top!
  - **Graduation Ceremony**: Countdown to 18th birthday where training wheels are removed and self-custody keys are transferred.
