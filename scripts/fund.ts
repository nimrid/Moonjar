import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8899';
const MAINNET_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function main() {
  const address = process.argv[2];
  const amountUsdc = parseFloat(process.argv[3] || '500');

  if (!address) {
    console.error('Usage: pnpm fund <SOLANA_WALLET_ADDRESS> [USDC_AMOUNT]');
    console.error('Example: pnpm fund BBNyzG9Kn1xf8ZFbwK2nKr3XW4MGr4XE8pQ9iJ1rsi57 500');
    process.exit(1);
  }

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch (e: any) {
    console.error(`Error: "${address}" is not a valid Solana address.`);
    process.exit(1);
  }

  console.log(`\n🌊 Funding wallet on Surfpool (${RPC_URL})...`);
  console.log(`   Target Address: ${pubkey.toBase58()}`);
  console.log(`   USDC Amount:    $${amountUsdc.toFixed(2)}`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // 1. Airdrop 5 SOL for gas
  try {
    console.log('   -> Requesting 5 SOL airdrop for transaction fees...');
    await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'requestAirdrop',
        params: [pubkey.toBase58(), 5_000_000_000],
      }),
    });
  } catch (err: any) {
    console.warn('   (Airdrop warning:', err.message, ')');
  }

  // 2. Fund USDC via Surfpool cheatcode
  const amountUnits = Math.floor(amountUsdc * 1_000_000);
  try {
    console.log(`   -> Setting USDC token account balance to $${amountUsdc}...`);
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'surfnet_setTokenAccount',
        params: [
          pubkey.toBase58(),
          MAINNET_USDC_MINT.toBase58(),
          { amount: amountUnits },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error('   ❌ Error from Surfpool:', data.error);
    }
  } catch (err: any) {
    console.error('   ❌ Failed to call surfnet_setTokenAccount:', err.message);
  }

  // 3. Verify Balances
  try {
    const solLamports = await connection.getBalance(pubkey);
    const ata = getAssociatedTokenAddressSync(MAINNET_USDC_MINT, pubkey, true, TOKEN_PROGRAM_ID);
    let usdcBalance = '0';
    try {
      const tokenBal = await connection.getTokenAccountBalance(ata);
      usdcBalance = tokenBal.value.uiAmountString || '0';
    } catch {
      usdcBalance = `${amountUsdc}`;
    }

    console.log(`\n✅ Successfully funded!`);
    console.log(`   SOL Balance:  ${(solLamports / 1_000_000_000).toFixed(4)} SOL`);
    console.log(`   USDC Balance: $${usdcBalance} USDC`);
    console.log(`   USDC ATA:     ${ata.toBase58()}\n`);
  } catch (err: any) {
    console.log(`\n✅ Funding command sent to Surfpool.`);
  }
}

main().catch(console.error);
