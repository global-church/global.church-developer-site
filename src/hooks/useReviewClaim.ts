'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useReviewClaim() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      claimId,
      action,
      notes,
    }: {
      claimId: string;
      action: 'approve' | 'reject';
      notes?: string;
    }) => {
      const res = await fetch('/api/admin/claims/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          action,
          ...(notes && { notes }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });

  return {
    reviewClaim: mutation.mutate,
    isPending: mutation.isPending,
  };
}
