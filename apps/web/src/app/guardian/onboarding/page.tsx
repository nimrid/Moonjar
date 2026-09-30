'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuardianWallet } from '@/components/providers/PrivySolanaProvider';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Pip } from '@/components/mascot/Pip';
import { BASKET_PRESETS, AnimalAvatar, AgeBand } from '@moonjar/shared';
import { saveVault, VaultState } from '@/lib/store';
import { RPC_URL, getNetworkLabel } from '@/lib/onchain';
import { PublicKey } from '@solana/web3.js';
import { ShieldCheck, ArrowRight, Lock, Check, Loader2, AlertCircle } from 'lucide-react';

const AVATARS: { id: AnimalAvatar; name: string; emoji: string }[] = [
  { id: 'otter', name: 'Otter', emoji: '🦦' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'fox', name: 'Fox', emoji: '🦊' },
  { id: 'owl', name: 'Owl', emoji: '🦉' },
  { id: 'koala', name: 'Koala', emoji: '🐨' },
  { id: 'badger', name: 'Badger', emoji: '🦡' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { publicKey, connected, authenticated, login, createVault } = useGuardianWallet();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Identity
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AnimalAvatar>('otter');
  const [ageBand, setAgeBand] = useState<AgeBand>('little');

  // Step 2: Consent
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [consent3, setConsent3] = useState(false);

  // Step 3: Vault Settings
  const [moonCapBps, setMoonCapBps] = useState(2000); // 20%
  const [initialDeposit, setInitialDeposit] = useState(25);
  const [selectedBasket, setSelectedBasket] = useState(BASKET_PRESETS[0].id);
  const [unlockYears, setUnlockYears] = useState(10); // 10 years until 18

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleFinish = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!connected || !publicKey) {
      setCreateError('Guardian wallet is still initializing. Please wait a few moments.');
      return;
    }

    const finalNickname = nickname.trim() || 'Scout';
    setIsCreating(true);
    setCreateError(null);

    const preset = BASKET_PRESETS.find((b) => b.id === selectedBasket) || BASKET_PRESETS[0];

    try {
      const basketEntries = preset.entries.map((e) => ({
        mint: new PublicKey(e.mint),
        weightBps: e.weightBps,
      }));

      // Call on-chain createVault via connected Privy embedded wallet
      const { vaultAddress } = await createVault({
        nickname: finalNickname,
        moonCapBps,
        basket: basketEntries,
        unlockYears,
        initialDepositUsdc: initialDeposit > 0 ? initialDeposit : undefined,
      });

      const newVault: VaultState = {
        metadata: {
          vaultAddress,
          nickname: finalNickname,
          avatar: selectedAvatar,
          ageBand,
          unlockDate: new Date(Date.now() + unlockYears * 365 * 24 * 3600 * 1000).toISOString(),
          guardianWallet: publicKey.toBase58(),
          capabilityToken: 'kid-' + Math.random().toString(36).substring(2, 10),
          createdAt: new Date().toISOString(),
        },
        saveBalanceUsdc: initialDeposit,
        moonBalanceUsdc: 0,
        moonCostBasisUsdc: 0,
        totalDepositedUsdc: initialDeposit,
        moonCapBps,
        isPaused: false,
        isGraduated: false,
        matchBalanceUsdc: initialDeposit * 0.01,
        allocations: preset.entries.map((e) => ({
          symbol: e.symbol,
          mint: e.mint,
          weightBps: e.weightBps,
          sharesOwned: 0,
          currentValueUsd: 0,
        })),
        decisions: [],
        requests: [],
        completedLessons: [],
        roundupTransactions: [],
      };

      saveVault(newVault);
      router.push('/guardian/dashboard');
    } catch (err: any) {
      console.error('Failed to create on-chain vault:', err);
      setCreateError(
        err.message ||
          'Failed to initialize vault on-chain. Please ensure your wallet has SOL to pay account rent.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-0 py-6 sm:py-8">
      {/* Progress header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-bold text-sm text-slate-500">
            Step {step} of 3
          </span>
          <span className="font-display font-bold text-xs uppercase tracking-wider text-purple-700">
            {step === 1 ? "Child Profile" : step === 2 ? "Safety & Consent" : "Vault Setup"}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-3 rounded-full border-2 border-ink overflow-hidden">
          <div
            className="bg-sun h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border-3 border-ink shadow-sticker-lg p-4 sm:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-slate-100 pb-4">
              <div className="shrink-0">
                <Pip expression="curious" size={72} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-ink">Who is this vault for?</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  We use zero-knowledge principles. Real names are never written on-chain!
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold font-display text-ink mb-1">
                Child's Nickname or First Name
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-ink text-lg font-bold"
                placeholder="e.g. Maya, Rocket-Boy, Scout"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                🔒 This is hashed on-chain as a SHA-256 identifier so your child's identity stays private.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold font-display text-ink mb-2">
                Choose an Animal Avatar
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.id)}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 border-ink transition-all ${
                      selectedAvatar === av.id
                        ? 'bg-amber-100 shadow-sticker-sm scale-105'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-3xl mb-1">{av.emoji}</span>
                    <span className="text-xs font-bold text-ink">{av.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold font-display text-ink mb-2">
                Select Reading Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAgeBand('little')}
                  className={`p-4 rounded-2xl border-2 border-ink text-left transition-all ${
                    ageBand === 'little' ? 'bg-amber-100 shadow-sticker-sm' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="font-display font-bold text-base block text-ink">🌱 Little Explorer</span>
                  <span className="text-xs text-slate-500">Ages 6–9. Simple metaphors, pizza slices & storybook cards.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAgeBand('big')}
                  className={`p-4 rounded-2xl border-2 border-ink text-left transition-all ${
                    ageBand === 'big' ? 'bg-purple-100 shadow-sticker-sm' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="font-display font-bold text-base block text-ink">🚀 Big Thinker</span>
                  <span className="text-xs text-slate-500">Ages 10–17. Real mechanics, valuation multiples & market dynamics.</span>
                </button>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                fullWidth
                disabled={!nickname.trim()}
                onClick={() => setStep(2)}
              >
                Continue to Consent & Disclosures <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-slate-100 pb-4">
              <div className="shrink-0">
                <Pip expression="thinking" size={72} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-ink">Parental Consent & Disclosures</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Please review and acknowledge these essential safety safeguards.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-ink bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={consent1}
                  onChange={(e) => setConsent1(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-purple-600 rounded border-2 border-ink shrink-0"
                />
                <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                  <strong>Risk & Illiquidity Disclosure:</strong> I understand that PreStocks represent synthetic tokens tracking private company valuations. They are volatile, illiquid, and carry financial risk with no guaranteed returns.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-ink bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={consent2}
                  onChange={(e) => setConsent2(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-purple-600 rounded border-2 border-ink shrink-0"
                />
                <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                  <strong>Guardrails & Moon Cap:</strong> I understand that the Moon Jar operates under a cost-basis cap (maximum 50%) that I configure, ensuring the majority of my child's savings remains securely in USDC.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-ink bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={consent3}
                  onChange={(e) => setConsent3(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-purple-600 rounded border-2 border-ink shrink-0"
                />
                <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                  <strong>COPPA & Privacy Agreement:</strong> I grant consent for this educational tool. I acknowledge that the kid's view is strictly read-only, collects no personal data, and serves no third-party advertisements or trackers.
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button variant="secondary" className="w-full sm:w-1/3" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                className="w-full sm:flex-1"
                disabled={!consent1 || !consent2 || !consent3}
                onClick={() => setStep(3)}
              >
                Accept & Configure Vault
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-slate-100 pb-4">
              <div className="shrink-0">
                <Pip expression="happy" size={72} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-ink">Configure {nickname}'s Vault</h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Set the rules for how savings grow and are protected.
                </p>
              </div>
            </div>

            {/* Moon Cap Slider */}
            <div>
              <Slider
                label="Maximum Moon Jar Allocation (Cost-Basis Cap)"
                min={5}
                max={50}
                value={moonCapBps / 100}
                onChange={(val) => setMoonCapBps(val * 100)}
                formatValue={(val) => `${val}%`}
                color="grape"
                helperText="We recommend 20%. The keeper will never buy more PreStocks than this fraction of total deposits."
              />
            </div>

            {/* Investment Basket Preset */}
            <div>
              <label className="block text-sm font-bold font-display text-ink mb-2">
                Choose Initial Investment Basket
              </label>
              <div className="space-y-2">
                {BASKET_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedBasket(preset.id)}
                    className={`w-full p-3 rounded-2xl border-2 border-ink text-left flex justify-between items-center transition-all ${
                      selectedBasket === preset.id
                        ? 'bg-purple-100 border-grape shadow-sticker-sm'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-display font-bold text-sm text-ink block truncate">{preset.name}</span>
                      <span className="text-xs text-slate-500 line-clamp-1">{preset.description}</span>
                    </div>
                    {selectedBasket === preset.id && (
                      <span className="w-6 h-6 rounded-full bg-grape text-white flex items-center justify-center text-xs shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Unlock duration */}
            <div>
              <Slider
                label="Time until Graduation (Years)"
                min={1}
                max={18}
                value={unlockYears}
                onChange={setUnlockYears}
                formatValue={(val) => `${val} Years`}
                color="sun"
                helperText="On the graduation date, full ownership and self-custody keys can be transferred to your child."
              />
            </div>

            {/* Initial Deposit */}
            <div>
              <label className="block text-sm font-bold font-display text-ink mb-1">
                Initial Deposit into Save Jar ($ USDC)
              </label>
              <input
                type="number"
                min={1}
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full p-3 rounded-2xl border-2 border-ink text-lg font-bold font-numbers"
              />
            </div>

            {createError && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <div className="font-bold">Deployment Notice:</div>
                  <div className="mt-0.5">{createError}</div>
                  <div className="mt-1 text-xs text-red-600">
                    {(RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost')) ? (
                      <>Tip: On Surfpool (localnet), run <code className="bg-red-100 px-1 py-0.5 rounded font-mono">pnpm fund {publicKey?.toBase58().slice(0, 8)}... 500</code> in terminal to fund your wallet with SOL and USDC.</>
                    ) : (
                      <>Tip: On {getNetworkLabel()}, get devnet USDC from the <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Circle faucet</a> and SOL from <code className="bg-red-100 px-1 py-0.5 rounded font-mono">solana airdrop 2</code>.</>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                variant="secondary"
                className="w-full sm:w-1/3"
                onClick={() => setStep(2)}
                disabled={isCreating}
              >
                Back
              </Button>
              <Button
                variant="leaf"
                className="w-full sm:flex-1 text-sm sm:text-base flex items-center justify-center gap-2"
                onClick={handleFinish}
                disabled={isCreating || (authenticated && !connected)}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying On-Chain Vault...
                  </>
                ) : !authenticated ? (
                  <>
                    <span>🍯</span> Connect Guardian Wallet First
                  </>
                ) : !connected ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Wallet...
                  </>
                ) : (
                  'Deploy & Activate Vault 🎉'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
