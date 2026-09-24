import { Connection, PublicKey } from '@solana/web3.js';
import {
  PROGRAM_ID,
  CHILD_VAULT_DISCRIMINATOR,
  MAX_BASKET_LEN,
} from './constants';
import { ChildVaultAccount, BasketEntry } from './types';

/**
 * High-performance binary deserializer for Anchor ChildVault accounts
 */
export function decodeChildVault(buffer: Uint8Array | Buffer): ChildVaultAccount {
  const data = new Uint8Array(buffer);
  if (data.length < 8) {
    throw new Error('Buffer too small to be a valid ChildVault account');
  }

  // Minimum size without the optional child_authority pubkey
  if (data.length < 366) {
    throw new Error(`ChildVault account too small: ${data.length} bytes (min 366)`);
  }

  // Validate 8-byte discriminator
  for (let i = 0; i < 8; i++) {
    if (data[i] !== CHILD_VAULT_DISCRIMINATOR[i]) {
      throw new Error('Account discriminator mismatch: not a ChildVault account');
    }
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Offset 8: guardian (32 bytes)
  const guardian = new PublicKey(data.subarray(8, 40));

  // Offset 40: child_authority (Option<Pubkey>)
  // 1 byte option tag (0 = None, 1 = Some)
  const hasChildAuth = data[40] === 1;
  let childAuthority: PublicKey | null = null;
  let offset = 41;
  if (hasChildAuth) {
    childAuthority = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
  }

  // nickname_hash (32 bytes)
  const nicknameHash = data.subarray(offset, offset + 32);
  offset += 32;

  // child_index (u64 LE)
  const childIndex = view.getBigUint64(offset, true);
  offset += 8;

  // unlock_ts (i64 LE)
  const unlockTs = view.getBigInt64(offset, true);
  offset += 8;

  // moon_cap_bps (u16 LE)
  const moonCapBps = view.getUint16(offset, true);
  offset += 2;

  // basket: [BasketEntry; MAX_BASKET_LEN = 8]
  // Each BasketEntry: mint (32 bytes) + weight_bps (2 bytes u16 LE) = 34 bytes
  const basket: BasketEntry[] = [];
  const basketStart = offset;
  for (let i = 0; i < MAX_BASKET_LEN; i++) {
    const entryOffset = basketStart + i * 34;
    const mint = new PublicKey(data.subarray(entryOffset, entryOffset + 32));
    const weightBps = view.getUint16(entryOffset + 32, true);
    basket.push({ mint, weightBps });
  }
  offset += MAX_BASKET_LEN * 34;

  // basket_len (u8)
  const basketLen = data[offset];
  offset += 1;
  // Guard against corrupted/malicious data
  const safeBasketLen = Math.min(basketLen, MAX_BASKET_LEN);

  // roundup_threshold (u64 LE)
  const roundupThreshold = view.getBigUint64(offset, true);
  offset += 8;

  // total_deposited (u64 LE)
  const totalDeposited = view.getBigUint64(offset, true);
  offset += 8;

  // moon_cost_basis (u64 LE)
  const moonCostBasis = view.getBigUint64(offset, true);
  offset += 8;

  // match_received (u64 LE)
  const matchReceived = view.getBigUint64(offset, true);
  offset += 8;

  // paused (bool = 1 byte)
  const paused = data[offset] === 1;
  offset += 1;

  // graduated (bool = 1 byte)
  const graduated = data[offset] === 1;
  offset += 1;

  // created_at (i64 LE)
  const createdAt = view.getBigInt64(offset, true);
  offset += 8;

  // bump (u8)
  const bump = data[offset];

  return {
    guardian,
    childAuthority,
    nicknameHash,
    childIndex,
    unlockTs,
    moonCapBps,
    basket: basket.slice(0, safeBasketLen),
    basketLen: safeBasketLen,
    roundupThreshold,
    totalDeposited,
    moonCostBasis,
    matchReceived,
    paused,
    graduated,
    createdAt,
    bump,
  };
}

/**
 * Fetch and decode a specific ChildVault account from Solana RPC
 */
export async function fetchChildVault(
  connection: Connection,
  address: PublicKey
): Promise<ChildVaultAccount | null> {
  const accountInfo = await connection.getAccountInfo(address, 'confirmed');
  if (!accountInfo || !accountInfo.data) return null;
  return decodeChildVault(accountInfo.data);
}

/**
 * Fetch and decode all ChildVault accounts for the MoonJar program on-chain
 */
export async function fetchAllChildVaults(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<Array<{ publicKey: PublicKey; account: ChildVaultAccount }>> {
  // Base58 encoded 8-byte discriminator [99, 87, 164, 169, 137, 204, 197, 118]
  const CHILD_VAULT_DISCRIMINATOR_BS58 = 'HckEBThXxQM';

  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: CHILD_VAULT_DISCRIMINATOR_BS58,
        },
      },
    ],
  });

  const results: Array<{ publicKey: PublicKey; account: ChildVaultAccount }> = [];
  for (const raw of accounts) {
    try {
      const decoded = decodeChildVault(raw.account.data);
      results.push({ publicKey: raw.pubkey, account: decoded });
    } catch (err) {
      console.warn(`[vault-client] Skipping invalid account ${raw.pubkey.toBase58()}:`, err);
    }
  }

  return results;
}
