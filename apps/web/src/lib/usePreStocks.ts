'use client';

import { useState, useEffect, useCallback } from 'react';
import { PreStockToken, PRESTOCKS_LIST, calculatePremiumPct, getPriceCheck, PriceCheckInfo } from '@moonjar/shared';

export interface UsePreStocksResult {
  tokens: PreStockToken[];
  source: 'live' | 'fallback';
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getToken: (symbol: string) => PreStockToken;
  getTokenPriceCheck: (token: PreStockToken) => PriceCheckInfo;
}

export function usePreStocks(): UsePreStocksResult {
  const [tokens, setTokens] = useState<PreStockToken[]>(PRESTOCKS_LIST);
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prestocks');
      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        setTokens(json.data);
        setSource(json.source || 'live');
      } else {
        setTokens(PRESTOCKS_LIST);
        setSource('fallback');
      }
    } catch (err: any) {
      console.warn('[usePreStocks] Using fallback token registry:', err.message);
      setError(err.message || 'Failed to fetch live prestocks');
      setTokens(PRESTOCKS_LIST);
      setSource('fallback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const getToken = useCallback(
    (symbol: string): PreStockToken => {
      const found = tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
      return found || PRESTOCKS_LIST.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase()) || PRESTOCKS_LIST[0];
    },
    [tokens]
  );

  const getTokenPriceCheck = useCallback((token: PreStockToken): PriceCheckInfo => {
    const premium = calculatePremiumPct(token.tokenPrice, token.markPrice);
    return getPriceCheck(premium);
  }, []);

  return {
    tokens,
    source,
    isLoading,
    error,
    refetch: fetchTokens,
    getToken,
    getTokenPriceCheck,
  };
}
