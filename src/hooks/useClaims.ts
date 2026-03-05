'use client';

import { useQuery } from '@tanstack/react-query';
import type { Claim } from '@/lib/types';

interface UseClaimsFilter {
  status?: string;
  limit?: number;
  offset?: number;
}

interface UseClaimsResult {
  claims: Claim[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClaims(filter: UseClaimsFilter = {}): UseClaimsResult {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  const qs = params.toString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['claims', filter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/claims${qs ? `?${qs}` : ''}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ claims: Claim[]; total: number }>;
    },
    retry: false,
  });

  return {
    claims: data?.claims ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
