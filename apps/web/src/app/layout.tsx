import type { Metadata } from 'next';
import '@/styles/globals.css';
import { WalletProvider } from '@/components/providers/WalletProvider';

export const metadata: Metadata = {
  title: 'Moonjar - Family Savings on Solana',
  description: 'A friendly, educational family savings app powered by PreStocks on Solana.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Strictly no third-party trackers or external CDNs for COPPA compliance */}
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
