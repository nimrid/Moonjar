import React from 'react';
import { GuardianNav } from '@/components/guardian/GuardianNav';

export default function GuardianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <GuardianNav />
      <div className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
