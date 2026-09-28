'use client';

import React, { useState, useEffect } from 'react';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getStoredVault } from '@/lib/store';
import confetti from 'canvas-confetti';
import {
  ArrowRightLeft,
  Coins,
  RefreshCw,
  Copy,
  Check,
  Send,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  PiggyBank,
  Terminal,
} from 'lucide-react';

interface WalletTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDestination?: 'vault' | 'custom';
}

export const WalletTransferModal: React.FC<WalletTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDestination = 'vault',
}) => {
  const {
    connected,
    address,
    solBalance,
    usdcBalance,
    isRefreshingBalances,
    refreshBalances,
    transferTokens,
    depositToVault,
    login,
  } = useGuardianWallet();

  const [destinationMode, setDestinationMode] = useState<'vault' | 'custom'>(defaultDestination);
  const [tokenType, setTokenType] = useState<'USDC' | 'SOL'>('USDC');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('50');
  const [status, setStatus] = useState<'idle' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const vault = getStoredVault(address);
  const vaultAddress = vault?.metadata?.vaultAddress;
  const childNickname = vault?.metadata?.nickname || 'Child';

  useEffect(() => {
    if (isOpen && connected) {
      refreshBalances();
      setStatus('idle');
      setTxSignature(null);
      setErrorMessage(null);
    }
  }, [isOpen, connected, refreshBalances]);

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const fundCommand = `pnpm fund ${address || '<YOUR_WALLET_ADDRESS>'} 500`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(fundCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const maxAmount = tokenType === 'USDC' ? usdcBalance : Math.max(0, solBalance - 0.01);

  const handleSetMax = () => {
    setAmount(maxAmount.toFixed(tokenType === 'USDC' ? 2 : 4));
  };

  const handleQuickAdd = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleExecuteTransfer = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    if (tokenType === 'USDC' && numAmount > usdcBalance) {
      setErrorMessage(`Insufficient USDC balance. You have $${usdcBalance.toFixed(2)} USDC.`);
      return;
    }

    if (tokenType === 'SOL' && numAmount > solBalance) {
      setErrorMessage(`Insufficient SOL balance. You have ${solBalance.toFixed(4)} SOL.`);
      return;
    }

    setErrorMessage(null);
    setStatus('signing');
    setStatusMessage('1/2 Signing transaction with Privy Embedded Wallet...');

    try {
      let signature = '';

      if (destinationMode === 'vault') {
        if (!vaultAddress) {
          throw new Error('No active vault address found. Please onboard a child vault first.');
        }

        setStatusMessage('2/2 Depositing USDC on-chain to Save Jar (Surfpool)...');
        try {
          const res = await depositToVault({
            vaultAddress,
            amountUsdc: numAmount,
          });
          signature = res.signature;
        } catch (anchorErr: any) {
          console.warn('Anchor deposit error, attempting direct SPL transfer to Save Jar ATA:', anchorErr);
          // If vault program was not initialized, transfer to Save Jar ATA directly or fallback to deposit API
          try {
            const res = await transferTokens({
              recipient: vaultAddress,
              amount: numAmount,
              token: 'USDC',
            });
            signature = res.signature;
          } catch {
            // Server fallback
            const apiRes = await fetch('/api/deposit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vaultAddress,
                amountUsdc: numAmount,
              }),
            });
            const apiData = await apiRes.json();
            if (!apiData.success) throw new Error(apiData.error || anchorErr.message);
            signature = apiData.txSignature;
          }
        }
      } else {
        // Custom recipient transfer
        if (!customRecipient.trim()) {
          throw new Error('Please specify a recipient Solana address.');
        }

        setStatusMessage(`2/2 Broadcasting ${tokenType} transfer to Surfpool...`);
        const res = await transferTokens({
          recipient: customRecipient.trim(),
          amount: numAmount,
          token: tokenType,
        });
        signature = res.signature;
      }

      setTxSignature(signature);
      setStatus('success');
      setStatusMessage('Transfer successfully confirmed on Surfpool!');

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      await refreshBalances();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Transfer failed:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Transaction failed. Check console for details.');
    }
  };

  if (!connected) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Privy Wallet Transfer">
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 border-2 border-ink flex items-center justify-center text-2xl shadow-sticker-sm">
            🔐
          </div>
          <h3 className="text-lg font-bold font-display text-ink">Guardian Wallet Required</h3>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            Please log in with your Privy Guardian embedded wallet to make on-chain transfers on Surfpool.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              login();
            }}
            className="w-full"
          >
            Connect Guardian Wallet
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privy Wallet Transfer">
      <div className="space-y-4 text-left">
        {/* Wallet Balance Header */}
        <div className="p-3 bg-amber-50 rounded-2xl border-2 border-ink shadow-sticker-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 font-display flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Guardian Privy Wallet
            </span>
            <button
              onClick={refreshBalances}
              disabled={isRefreshingBalances}
              className="text-xs flex items-center gap-1 text-slate-600 hover:text-ink font-bold"
              title="Refresh balances"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="font-mono text-slate-700 truncate max-w-[200px]">
              {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Loading...'}
            </span>
            <button
              onClick={handleCopyAddress}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
            >
              {copiedAddr ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copiedAddr ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Live balances pills */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-white p-2 rounded-xl border border-amber-200 text-center">
              <span className="block text-[10px] font-bold uppercase text-slate-500 font-display">USDC Balance</span>
              <span className="text-sm font-extrabold text-emerald-700 font-display">
                ${usdcBalance.toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200 text-center">
              <span className="block text-[10px] font-bold uppercase text-slate-500 font-display">SOL (Gas)</span>
              <span className="text-sm font-extrabold text-indigo-700 font-display">
                {solBalance.toFixed(3)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* CLI Funding Hint if balance is low */}
        {usdcBalance === 0 && (
          <div className="p-2.5 bg-sky-50 rounded-xl border-2 border-sky-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-900 font-display">
              <Terminal className="w-3.5 h-3.5 text-sky-700" />
              Need USDC or SOL on Surfpool?
            </div>
            <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-sky-200 font-mono text-[11px] text-slate-700">
              <span className="truncate">{fundCommand}</span>
              <button
                onClick={handleCopyCmd}
                className="text-sky-700 font-bold hover:text-sky-900 ml-2 shrink-0 flex items-center gap-1"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedCmd ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Destination Mode Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold font-display text-ink uppercase tracking-wider">
            Transfer Destination
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDestinationMode('vault');
                setTokenType('USDC');
              }}
              className={`p-2 rounded-xl border-2 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                destinationMode === 'vault'
                  ? 'bg-amber-400 border-ink shadow-sticker-sm text-ink'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <PiggyBank className="w-4 h-4" />
              {childNickname}'s Save Jar
            </button>
            <button
              type="button"
              onClick={() => setDestinationMode('custom')}
              className={`p-2 rounded-xl border-2 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                destinationMode === 'custom'
                  ? 'bg-amber-400 border-ink shadow-sticker-sm text-ink'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Custom Address
            </button>
          </div>
        </div>

        {/* Custom Recipient input if in custom mode */}
        {destinationMode === 'custom' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold font-display text-ink">Recipient Solana Address</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 font-display">Token:</span>
                <button
                  type="button"
                  onClick={() => setTokenType('USDC')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    tokenType === 'USDC' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  USDC
                </button>
                <button
                  type="button"
                  onClick={() => setTokenType('SOL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    tokenType === 'SOL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  SOL
                </button>
              </div>
            </div>
            <input
              type="text"
              value={customRecipient}
              onChange={(e) => setCustomRecipient(e.target.value)}
              placeholder="e.g. 7Zk4...x9Yz"
              className="w-full text-xs font-mono px-3 py-2 rounded-xl border-2 border-ink focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold font-display text-ink uppercase tracking-wider">
              Amount ({tokenType})
            </label>
            <button
              type="button"
              onClick={handleSetMax}
              className="text-[11px] font-bold text-purple-700 hover:underline font-display"
            >
              Max: {tokenType === 'USDC' ? `$${usdcBalance.toFixed(2)}` : `${maxAmount.toFixed(3)} SOL`}
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              min="0.01"
              step={tokenType === 'USDC' ? '1' : '0.1'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-lg font-bold font-display px-3 py-2 rounded-xl border-2 border-ink focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500 font-display">
              {tokenType}
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 pt-1">
            {[10, 25, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-amber-100 text-slate-700 font-display transition-colors"
              >
                +${val}
              </button>
            ))}
          </div>
        </div>

        {/* Status Messages / Feedback */}
        {status === 'signing' || status === 'confirming' ? (
          <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300 text-xs font-bold text-amber-900 flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {status === 'success' && (
          <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-400 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-900 font-display text-sm">
              <Check className="w-4 h-4 text-emerald-600" />
              Transfer Confirmed on Surfpool!
            </div>
            {txSignature && (
              <p className="font-mono text-[11px] text-emerald-800 break-all pt-0.5">
                Tx: {txSignature}
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 bg-rose-50 rounded-xl border-2 border-rose-300 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="break-all">{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={handleExecuteTransfer}
            disabled={status === 'signing' || status === 'confirming'}
            className="w-full flex items-center justify-center gap-2 py-2.5"
          >
            {status === 'signing' || status === 'confirming' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {destinationMode === 'vault'
                  ? `Sign & Deposit $${amount} to Save Jar`
                  : `Sign & Send ${amount} ${tokenType}`}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
