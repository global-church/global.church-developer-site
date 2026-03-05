'use client';

import { useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { SessionLoader } from '@/contexts/SessionContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider><SessionLoader>{children}</SessionLoader></AuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#2563eb',
        },
        loginMethods: ['email', 'google'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider><SessionLoader>{children}</SessionLoader></AuthProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
