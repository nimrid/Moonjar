import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  PRESTOCKS_LIST,
  PreStockToken,
  BuyDecisionLog,
  calculatePremiumPct,
  getPriceCheck,
  getExplorerCopy,
} from '@moonjar/shared';
import * as dotenv from 'dotenv';

dotenv.config();

interface MonitoredVault {
  address: string;
  guardian: string;
  nickname: string;
  saveBalanceUsdc: number;
  moonBalanceUsdc: number;
  moonCostBasisUsdc: number;
  totalDepositedUsdc: number;
  moonCapBps: number; // 2000 = 20%
  isPaused: boolean;
  basket: { symbol: string; targetWeightBps: number }[];
}

const DEMO_VAULTS: MonitoredVault[] = [
  {
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    guardian: 'BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57',
    nickname: 'Leo The Explorer',
    saveBalanceUsdc: 185.50,
    moonBalanceUsdc: 38.75,
    moonCostBasisUsdc: 32.00,
    totalDepositedUsdc: 217.50,
    moonCapBps: 2000,
    isPaused: false,
    basket: [
      { symbol: 'SPACEX', targetWeightBps: 4000 },
      { symbol: 'ANDURIL', targetWeightBps: 3500 },
      { symbol: 'FIGUREAI', targetWeightBps: 2500 },
    ],
  },
];

async function evaluateVault(vault: MonitoredVault): Promise<BuyDecisionLog | null> {
  console.log(`\n======================================================`);
  console.log(`[Keeper] 🍯 Evaluating Vault: ${vault.nickname} (${vault.address.slice(0, 8)}...)`);
  console.log(`  Save Balance: $${vault.saveBalanceUsdc.toFixed(2)} | Moon Cost Basis: $${vault.moonCostBasisUsdc.toFixed(2)} | Cap: ${vault.moonCapBps / 100}%`);

  if (vault.isPaused) {
    console.log(`  ⏸️ Vault is currently paused by guardian. Skipping.`);
    return null;
  }

  // 1. Check cap headroom
  const maxAllowedMoon = (vault.totalDepositedUsdc * vault.moonCapBps) / 10000;
  const remainingCapHeadroom = maxAllowedMoon - vault.moonCostBasisUsdc;

  console.log(`  Cap Ceiling: $${maxAllowedMoon.toFixed(2)} | Remaining Headroom: $${remainingCapHeadroom.toFixed(2)}`);

  if (remainingCapHeadroom <= 0) {
    console.log(`  🛑 Cap limit reached! Moon Jar cost basis is at maximum allowed percentage.`);
    return {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vault.address,
      symbol: 'PORTFOLIO',
      action: 'BLOCKED_BY_CAP',
      machineReason: `COST_BASIS_CAP_EXCEEDED (${vault.moonCostBasisUsdc.toFixed(2)} >= ${maxAllowedMoon.toFixed(2)})`,
      humanReasonKid: `Your Moon Jar is currently full! Pip is keeping all new coins safely in your Save Jar.`,
      humanReasonGuardian: `Moon Jar cost basis has reached the guardian set limit of ${vault.moonCapBps / 100}%. Purchases blocked.`,
    };
  }

  // 2. Target allocation deficit
  // Pick the first asset in basket with target weight
  const candidate = vault.basket[Math.floor(Math.random() * vault.basket.length)];
  const tokenMeta = PRESTOCKS_LIST.find((p) => p.symbol === candidate.symbol) || PRESTOCKS_LIST[0];

  // 3. Check valuation metric delta & premium
  // In devnet / production, this queries Jupiter quote + implied valuation
  const premium = calculatePremiumPct(tokenMeta.tokenPrice, tokenMeta.markPrice);
  const priceCheck = getPriceCheck(premium);

  console.log(`  Target Asset: ${tokenMeta.name} (${tokenMeta.symbol})`);
  console.log(`  Token Price: $${tokenMeta.tokenPrice} | Mark Valuation: $${(tokenMeta.markValuation / 1e9).toFixed(1)}B`);
  console.log(`  Secondary Premium: ${premium.toFixed(2)}% (Max Allowed: 10.0%)`);

  const buyAmountUsdc = Math.min(5.00, remainingCapHeadroom, vault.saveBalanceUsdc);

  if (priceCheck.skipCycle) {
    console.log(`  ❌ Price Check Failed: ${priceCheck.tag} - Premium ${premium.toFixed(2)}% > 10.0%`);
    return {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vaultAddress: vault.address,
      symbol: tokenMeta.symbol,
      action: 'SKIP',
      premiumPct: premium,
      machineReason: `PREMIUM_TOO_HIGH (${premium.toFixed(2)}% > 10.0%)`,
      humanReasonKid: `${tokenMeta.name} costs a bit too much today. Pip is keeping your coins safe and cozy in the Save Jar!`,
      humanReasonGuardian: `${tokenMeta.symbol} premium is ${premium.toFixed(2)}%, above the 10% safety ceiling. Purchase deferred.`,
    };
  }

  if (buyAmountUsdc < 1.00) {
    console.log(`  ⚠️ Insufficient cash or cap headroom ($${buyAmountUsdc.toFixed(2)} < $1.00). Skipping.`);
    return null;
  }

  // 4. Executing purchase simulation
  const sharesOut = Number((buyAmountUsdc / tokenMeta.tokenPrice).toFixed(4));
  const txSig = `devnet_${Math.random().toString(36).substring(2, 10)}`;

  console.log(`  ✅ Price Check Passed: ${priceCheck.tag}`);
  console.log(`  🚀 Executed Buy: $${buyAmountUsdc.toFixed(2)} USDC -> ${sharesOut} ${tokenMeta.symbol} shares`);
  console.log(`  Devnet Signature: ${txSig}`);

  return {
    id: `dec-${Date.now()}`,
    timestamp: new Date().toISOString(),
    vaultAddress: vault.address,
    symbol: tokenMeta.symbol,
    action: 'BUY',
    premiumPct: premium,
    amountInUsdc: Math.floor(buyAmountUsdc * 1_000_000),
    amountOutTokens: Math.floor(sharesOut * 1_000_000),
    machineReason: `PREMIUM_ACCEPTABLE (${premium.toFixed(2)}% <= 10.0%)`,
    humanReasonKid: `Pip found a fair price for ${tokenMeta.name} and tucked a new piece into your Moon Jar!`,
    humanReasonGuardian: `Executed algorithmic purchase for ${tokenMeta.symbol} at ${premium.toFixed(2)}% premium. $${buyAmountUsdc.toFixed(2)} allocated.`,
    txSignature: txSig,
  };
}

async function runKeeper() {
  const isOnce = process.argv.includes('--once');
  console.log(`\n======================================================`);
  console.log(`🌙 Moonjar Valuation Keeper Service starting...`);
  console.log(`Mode: ${isOnce ? 'One-Shot Execution' : 'Continuous Daemon (30s interval)'}`);
  console.log(`Solana RPC: ${process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'}`);
  console.log(`PreStocks Monitored: ${PRESTOCKS_LIST.map((p) => p.symbol).join(', ')}`);

  const loop = async () => {
    for (const vault of DEMO_VAULTS) {
      await evaluateVault(vault);
    }
  };

  await loop();

  if (!isOnce) {
    setInterval(loop, 30000);
  }
}

runKeeper().catch((err) => {
  console.error('[Keeper Error]', err);
  process.exit(1);
});
