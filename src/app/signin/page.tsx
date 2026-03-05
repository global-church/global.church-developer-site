'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInPage() {
  const { isAuthenticated, loading, connect } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') ?? null;
  const error = searchParams?.get('error') ?? null;

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(redirect ?? '/developer');
    }
  }, [isAuthenticated, loading, router, redirect]);

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
