import { PreStockToken, PreStockTokenSchema, PriceCheckInfo, PriceCheckTag, BasketPreset } from './types.js';

export const PRESTOCKS_API_URL = 'https://prestocks.com/api/prestocks';

export function calculatePremiumPct(tokenPrice: number, markPrice: number): number {
  if (markPrice <= 0) return 0;
  return ((tokenPrice - markPrice) / markPrice) * 100;
}

export function getPriceCheck(premiumPct: number): PriceCheckInfo {
  if (premiumPct > 10) {
    return {
      tag: 'Too pricey',
      premiumPct,
      explanation: 'The market price is much higher than the company’s estimated value. Pip is waiting for a better price!',
      weightMultiplier: 0,
      skipCycle: true,
    };
  }
  if (premiumPct >= 5) {
    return {
      tag: 'A little pricey',
      premiumPct,
      explanation: 'Trading a bit above estimated value, so we take a smaller bite today.',
      weightMultiplier: 0.5,
      skipCycle: false,
    };
  }
  if (premiumPct < -5) {
    return {
      tag: 'On sale',
      premiumPct,
      explanation: 'Trading below its estimated value! A nice opportunity for the Moon Jar.',
      weightMultiplier: 1.25,
      skipCycle: false,
    };
  }
  return {
    tag: 'Fair price',
    premiumPct,
    explanation: 'The market price is close to the estimated value of the company.',
    weightMultiplier: 1.0,
    skipCycle: false,
  };
}

export async function fetchLivePreStocks(): Promise<PreStockToken[]> {
  const res = await fetch(PRESTOCKS_API_URL, {
    headers: {
      'User-Agent': 'Moonjar/1.0',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch PreStocks API: HTTP ${res.status}`);
  }
  const raw = await res.json();
  if (!Array.isArray(raw)) {
    throw new Error('PreStocks API did not return an array');
  }
  return raw.map((item) => PreStockTokenSchema.parse(item));
}

export const BASKET_PRESETS: BasketPreset[] = [
  {
    id: 'frontier-tech',
    name: 'Frontier Tech',
    description: 'Rockets, defense technology, and general-purpose humanoid robots.',
    entries: [
      { symbol: 'SPACEX', mint: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh', weightBps: 4000 },
      { symbol: 'ANDURIL', mint: 'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB', weightBps: 3500 },
      { symbol: 'FIGUREAI', mint: 'PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd', weightBps: 2500 },
    ],
  },
  {
    id: 'ai-frontier',
    name: 'AI Frontier',
    description: 'The leading research teams building helpful, ethical artificial intelligence.',
    entries: [
      { symbol: 'ANTHROPIC', mint: 'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw', weightBps: 5000 },
      { symbol: 'OPENAI', mint: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF', weightBps: 5000 },
    ],
  },
  {
    id: 'prediction-markets',
    name: 'Future Truth',
    description: 'Information markets where people forecast real-world events and science.',
    entries: [
      { symbol: 'KALSHI', mint: 'PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua', weightBps: 5000 },
      { symbol: 'POLYMARKET', mint: 'Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP', weightBps: 5000 },
    ],
  },
];
