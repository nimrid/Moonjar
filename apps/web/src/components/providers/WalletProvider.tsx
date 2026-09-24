'use client';

import React, { FC, ReactNode } from 'react';
import { PrivySolanaProvider } from './PrivySolanaProvider';

interface Props {
  children: ReactNode;
}

/**
 * WalletProvider now delegates directly to PrivySolanaProvider
 * for embedded wallet management on Solana.
 */
export const WalletProvider: FC<Props> = ({ children }) => {
  return <PrivySolanaProvider>{children}</PrivySolanaProvider>;
};
