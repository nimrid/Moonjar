import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { PrivySolanaProvider } from '@/components/providers/PrivySolanaProvider';

export const metadata: Metadata = {
  title: 'Moonjar - Family Savings on Solana',
  description: 'A friendly, educational family savings app powered by PreStocks on Solana.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        <PrivySolanaProvider>
          {children}
        </PrivySolanaProvider>
      </body>
    </html>
  );
}
