'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInPage() {
  const { isAuthenticated, user, loading, connect } = useAuth();
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') ?? null;
  const error = searchParams?.get('error') ?? null;
  const provisioningRef = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || provisioningRef.current) return;
    provisioningRef.current = true;

    // Get the access token from Privy SDK and provision profile
    getAccessToken().then((token) => {
      if (!token) {
        console.error('No Privy access token available');
        router.replace(redirect ?? '/developer');
        return;
      }

      return fetch('/api/auth/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user?.email,
          name: user?.name,
        }),
      }).then((res) => {
        if (!res.ok) {
          console.error('Profile provision failed:', res.status);
        }
        router.replace(redirect ?? '/developer');
      });
    }).catch((err) => {
      console.error('Profile provision error:', err);
      router.replace(redirect ?? '/developer');
    });
  }, [isAuthenticated, loading, user, router, redirect, getAccessToken]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in to Global.Church
          </h1>
          <p className="text-gray-500 mt-2">
            Access your developer portal, API keys, and admin tools.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : isAuthenticated ? (
          <div className="text-gray-400 text-sm">Redirecting...</div>
        ) : (
          <button
            onClick={connect}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}
