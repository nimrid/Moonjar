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

export const PRESTOCKS_DECIMALS = 9;
export const USDC_DECIMALS = 6;

export const PRESTOCKS_LIST: PreStockToken[] = [
  {
    name: 'SpaceX',
    symbol: 'SPACEX',
    description: 'Space exploration, launch services, and satellite communications (Starlink).',
    image: 'https://prestocks.com/images/spacex.png',
    external_url: 'https://spacex.com',
    contract_address: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    markPrice: 152.33,
    markValuation: 1997175099617,
    tokenPrice: 116.3,
    impliedValuation: 1524792914598,
    supply: 43712.53333237,
  },
  {
    name: 'OpenAI',
    symbol: 'OPENAI',
    description: 'Pioneering AI research and deployment including ChatGPT and generative models.',
    image: 'https://prestocks.com/images/openai.png',
    external_url: 'https://openai.com',
    contract_address: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
    markPrice: 1002.61,
    markValuation: 1242165703764,
    tokenPrice: 1156.72,
    impliedValuation: 1433099722780,
    supply: 2826.408873829376,
  },
  {
    name: 'Anthropic',
    symbol: 'ANTHROPIC',
    description: 'AI safety and research company, creators of Claude.',
    image: 'https://prestocks.com/images/anthropic.png',
    external_url: 'https://anthropic.com',
    contract_address: 'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw',
    markPrice: 1050.76,
    markValuation: 1721500680737,
    tokenPrice: 1042.91,
    impliedValuation: 1708635732411,
    supply: 7381.844740813,
  },
  {
    name: 'Anduril',
    symbol: 'ANDURIL',
    description: 'Defense technology company building autonomous systems and hardware.',
    image: 'https://prestocks.com/images/anduril.png',
    external_url: 'https://anduril.com',
    contract_address: 'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB',
    markPrice: 152.82,
    markValuation: 135196299296,
    tokenPrice: 150.95,
    impliedValuation: 133542997041,
    supply: 11805.838210405,
  },
  {
    name: 'Figure AI',
    symbol: 'FIGUREAI',
    description: 'Developing autonomous humanoid robots for labor and assistance.',
    image: 'https://prestocks.com/images/figureai.png',
    external_url: 'https://figure.ai',
    contract_address: 'PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd',
    markPrice: 182.04,
    markValuation: 39688765771,
    tokenPrice: 175.19,
    impliedValuation: 38196339516,
    supply: 3012.861809963,
  },
  {
    name: 'Kalshi',
    symbol: 'KALSHI',
    description: 'CFTC-regulated prediction and event contract market.',
    image: 'https://prestocks.com/images/kalshi.png',
    external_url: 'https://kalshi.com',
    contract_address: 'PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua',
    markPrice: 887.64,
    markValuation: 32285297730,
    tokenPrice: 887.06,
    impliedValuation: 32264056191,
    supply: 904.892787214,
  },
  {
    name: 'Polymarket',
    symbol: 'POLYMARKET',
    description: 'Decentralized prediction market platform.',
    image: 'https://prestocks.com/images/polymarket.png',
    external_url: 'https://polymarket.com',
    contract_address: 'Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP',
    markPrice: 144.16,
    markValuation: 14218020535,
    tokenPrice: 142.99,
    impliedValuation: 14102754306,
    supply: 4817.01407746,
  },
  {
    name: 'Neuralink',
    symbol: 'NEURALINK',
    description: 'Brain-computer interface technology company.',
    image: 'https://prestocks.com/images/neuralink.png',
    external_url: 'https://neuralink.com',
    contract_address: 'PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S',
    markPrice: 338.09,
    markValuation: 64403779011,
    tokenPrice: 460.4,
    impliedValuation: 87703546111,
    supply: 2595.320990974,
  },
];
