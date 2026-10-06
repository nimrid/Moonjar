import { z } from 'zod';

export const PreStockTokenSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  description: z.string(),
  image: z.string().url(),
  external_url: z.string().url(),
  contract_address: z.string(),
  markPrice: z.number(),
  markValuation: z.number(),
  tokenPrice: z.number(),
  impliedValuation: z.number(),
  supply: z.number().nullable().optional(),
});

export type PreStockToken = z.infer<typeof PreStockTokenSchema>;

export type PriceCheckTag = 'Fair price' | 'A little pricey' | 'Too pricey' | 'On sale';

export interface PriceCheckInfo {
  tag: PriceCheckTag;
  premiumPct: number;
  explanation: string;
  weightMultiplier: number;
  skipCycle: boolean;
}

export interface BasketEntry {
  mint: string;
  symbol: string;
  weightBps: number; // Sum to 10000
}

export interface BasketPreset {
  id: string;
  name: string;
  description: string;
  entries: BasketEntry[];
}

export type AnimalAvatar = 'otter' | 'panda' | 'fox' | 'owl' | 'koala' | 'badger';

export type AgeBand = 'little' | 'big'; // 6-9 vs 10-17

export interface ChildVaultMetadata {
  vaultAddress: string;
  nickname: string;
  avatar: AnimalAvatar;
  ageBand: AgeBand;
  unlockDate: string; // ISO date string
  guardianWallet: string;
  capabilityToken: string;
  createdAt: string;
}

export interface BuyDecisionLog {
  id: string;
  timestamp: string;
  vaultAddress: string;
  symbol: string;
  action: 'BUY' | 'SKIP';
  premiumPct?: number | null;
  amountInUsdc?: number;
  amountOutTokens?: number;
  machineReason: string;
  humanReasonKid: string;
  humanReasonGuardian: string;
  txSignature?: string;
}

export interface KidRequest {
  id: string;
  vaultAddress: string;
  timestamp: string;
  type: 'ADD_MONEY' | 'LEARN' | 'STATUS';
  amount?: number; // 1, 5, 10
  topic?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED';
}

export interface GiftLink {
  id: string;
  vaultAddress: string;
  senderName: string;
  memoEmoji: string;
  amount?: number;
  claimed: boolean;
  createdAt: string;
}
