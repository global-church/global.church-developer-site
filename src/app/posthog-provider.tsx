'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    posthog.capture('$pageview');
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';
    if (!apiKey) {
      if (isProd) {
        // Surface a clear hint during production if PostHog is not configured
        // (useful when env var is missing in Vercel)
        // eslint-disable-next-line no-console
        console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is missing. Analytics are disabled.');
      }
      return;
    }
    if (isDev) return;

    posthog.init(apiKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/posthog',
      capture_pageview: false,
      capture_pageleave: true,
    });
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
