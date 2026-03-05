'use client';

import { useState } from 'react';
import { useClaims } from '@/hooks/useClaims';
import { useReviewClaim } from '@/hooks/useReviewClaim';
import type { Claim } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TABS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
] as const;

const PAGE_SIZE = 20;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: Claim['status'] }) {
  const variant = {
    pending: 'outline' as const,
    approved: 'default' as const,
    rejected: 'destructive' as const,
  };
  return <Badge variant={variant[status]}>{status}</Badge>;
}

function DomainIndicator({ match }: { match: boolean }) {
  if (match) {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-xs">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Domain match
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-amber-600 text-xs">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
      </svg>
      No match
    </span>
  );
}

function ClaimCard({ claim, onReview, isPending }: {
  claim: Claim;
  onReview: (claimId: string, action: 'approve' | 'reject', notes?: string) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState('');
  const userName = [claim.user_first_name, claim.user_last_name].filter(Boolean).join(' ');

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-100 font-medium text-sm">
              {userName || 'Unknown'}
            </span>
            <span className="text-slate-400 text-xs">{claim.user_email}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-slate-200 text-sm">{claim.org_name}</span>
            {claim.is_new_org && (
              <Badge variant="secondary" className="text-[10px]">New org</Badge>
            )}
            {claim.new_org_type && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                {claim.new_org_type}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={claim.status} />
          <span className="text-slate-400 text-xs whitespace-nowrap">{relativeTime(claim.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap mb-3">
        <DomainIndicator match={claim.domain_match} />
        <span className="text-slate-400">
          {claim.email_domain}
          {claim.org_domain && claim.email_domain !== claim.org_domain && (
            <> vs {claim.org_domain}</>
          )}
        </span>
        <span className="text-slate-500">{claim.result_variant}</span>
        {claim.new_org_website && (
          <a
            href={claim.new_org_website.startsWith('http') ? claim.new_org_website : `https://${claim.new_org_website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {claim.new_org_website}
          </a>
        )}
      </div>

      {claim.reviewed_by && (
        <div className="text-xs text-slate-400 mb-3">
          Reviewed by {claim.reviewed_by}
          {claim.reviewed_at && <> &middot; {relativeTime(claim.reviewed_at)}</>}
          {claim.review_notes && <> &mdash; {claim.review_notes}</>}
        </div>
      )}

      {claim.status === 'pending' && (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onReview(claim.id, 'approve', notes || undefined); setNotes(''); }}
            disabled={isPending}
            className="text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/10"
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onReview(claim.id, 'reject', notes || undefined); setNotes(''); }}
            disabled={isPending}
            className="text-red-400 border-red-600/30 hover:bg-red-600/10"
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export function ClaimsReview() {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { claims, total, loading, error } = useClaims({
    status: activeTab,
    limit,
  });
  const { reviewClaim, isPending } = useReviewClaim();

  function handleReview(claimId: string, action: 'approve' | 'reject', notes?: string) {
    reviewClaim({ claimId, action, notes });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Org Claims</h1>
        <Badge variant="secondary">{total}</Badge>
      </div>

      <div className="flex gap-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => { setActiveTab(tab.value); setLimit(PAGE_SIZE); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading claims...
          </div>
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          No claims found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {claims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onReview={handleReview}
              isPending={isPending}
            />
          ))}

          {total > claims.length && (
            <button
              onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
              className="mt-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-slate-200 hover:bg-slate-800 transition-colors mx-auto"
            >
              Load more ({claims.length} of {total})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
