import { PreStockToken, PreStockTokenSchema, PriceCheckInfo, PriceCheckTag, BasketPreset } from './types';

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

export const PRESTOCKS_LIST: PreStockToken[] = [
  {
    name: 'SpaceX',
    symbol: 'SPACEX',
    description: 'Space exploration, launch services, and satellite communications (Starlink).',
    image: 'https://prestocks.com/images/spacex.png',
    external_url: 'https://spacex.com',
    contract_address: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    markPrice: 11.2,
    markValuation: 350000000000,
    tokenPrice: 12.1,
    impliedValuation: 378125000000,
    supply: 31250000000,
  },
  {
    name: 'OpenAI',
    symbol: 'OPENAI',
    description: 'Pioneering AI research and deployment including ChatGPT and generative models.',
    image: 'https://prestocks.com/images/openai.png',
    external_url: 'https://openai.com',
    contract_address: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
    markPrice: 15.75,
    markValuation: 157000000000,
    tokenPrice: 18.2,
    impliedValuation: 181434920635,
    supply: 9968951683,
  },
  {
    name: 'Anthropic',
    symbol: 'ANTHROPIC',
    description: 'AI safety and research company, creators of Claude.',
    image: 'https://prestocks.com/images/anthropic.png',
    external_url: 'https://anthropic.com',
    contract_address: 'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw',
    markPrice: 6.8,
    markValuation: 40000000000,
    tokenPrice: 7.1,
    impliedValuation: 41764705882,
    supply: 5882352941,
  },
  {
    name: 'Anduril',
    symbol: 'ANDURIL',
    description: 'Defense technology company building autonomous systems and hardware.',
    image: 'https://prestocks.com/images/anduril.png',
    external_url: 'https://anduril.com',
    contract_address: 'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB',
    markPrice: 8.5,
    markValuation: 14000000000,
    tokenPrice: 8.9,
    impliedValuation: 14658823529,
    supply: 1647058824,
  },
  {
    name: 'Figure AI',
    symbol: 'FIGUREAI',
    description: 'Developing autonomous humanoid robots for labor and assistance.',
    image: 'https://prestocks.com/images/figureai.png',
    external_url: 'https://figure.ai',
    contract_address: 'PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd',
    markPrice: 4.2,
    markValuation: 2600000000,
    tokenPrice: 4.4,
    impliedValuation: 2723809524,
    supply: 619047619,
  },
  {
    name: 'Kalshi',
    symbol: 'KALSHI',
    description: 'CFTC-regulated prediction and event contract market.',
    image: 'https://prestocks.com/images/kalshi.png',
    external_url: 'https://kalshi.com',
    contract_address: 'PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua',
    markPrice: 2.1,
    markValuation: 750000000,
    tokenPrice: 2.15,
    impliedValuation: 767857143,
    supply: 357142857,
  },
  {
    name: 'Polymarket',
    symbol: 'POLYMARKET',
    description: 'Decentralized prediction market platform.',
    image: 'https://prestocks.com/images/polymarket.png',
    external_url: 'https://polymarket.com',
    contract_address: 'Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP',
    markPrice: 3.5,
    markValuation: 1000000000,
    tokenPrice: 3.65,
    impliedValuation: 1042857143,
    supply: 285714286,
  },
  {
    name: 'Neuralink',
    symbol: 'NEURALINK',
    description: 'Brain-computer interface technology company.',
    image: 'https://prestocks.com/images/neuralink.png',
    external_url: 'https://neuralink.com',
    contract_address: 'PremvM81YvkmD4bCgtQZ1A68wVv6n9eRk8Z1kK8zXoN',
    markPrice: 18.0,
    markValuation: 8000000000,
    tokenPrice: 22.5,
    impliedValuation: 10000000000,
    supply: 444444444,
  },
];
