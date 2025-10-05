'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchChurches, getChurchById } from '@/lib/zuplo';
import type { ChurchPublic } from '@/lib/types';
import { logoutAdmin } from '@/app/admin/actions';
import { ChurchEditor } from './ChurchEditor';

type ToastTone = 'success' | 'error' | 'info';

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
} | null;

type SearchFilters = {
  query: string;
  locality: string;
  id: string;
};

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  locality: '',
  id: '',
};

const PAGE_SIZE = 10;

export function AdminDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<ChurchPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<ChurchPublic | null>(null);
  const [selectedChurchLoading, setSelectedChurchLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<'idle' | 'edit' | 'create'>('idle');
  const [creationSeed, setCreationSeed] = useState<Partial<ChurchPublic> | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [logoutPending, startLogout] = useTransition();

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    setToast({ id: Date.now(), tone, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast((prev) => (prev && prev.id === toast.id ? null : prev));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchResults = useCallback(async (cursor: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchChurches({
        q: filters.query || undefined,
        locality: filters.locality || undefined,
        id: filters.id || undefined,
        limit: PAGE_SIZE,
        cursor: cursor ?? undefined,
      });
      setResults(response.items);
      setNextCursor(response.nextCursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setResults([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [filters.id, filters.locality, filters.query]);

  const handleSearch = useCallback(async () => {
    setCursorHistory([]);
    setCurrentCursor(null);
    await fetchResults(null);
  }, [fetchResults]);

  const handleNextPage = useCallback(async () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    const cursorToFetch = nextCursor;
    setCurrentCursor(cursorToFetch);
    await fetchResults(cursorToFetch);
  }, [currentCursor, fetchResults, nextCursor]);

  const handlePreviousPage = useCallback(async () => {
    if (!cursorHistory.length) return;
    const historyClone = cursorHistory.slice(0, -1);
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? null;
    setCursorHistory(historyClone);
    setCurrentCursor(previousCursor);
    await fetchResults(previousCursor);
  }, [cursorHistory, fetchResults]);

  const handleSelectChurch = useCallback(async (churchId: string) => {
    setSelectedChurchLoading(true);
    setSelectedChurch(null);
    setEditorMode('idle');
    try {
      const church = await getChurchById(churchId);
      if (!church) {
        pushToast('error', 'Unable to load church details.');
        return;
      }
      setSelectedChurch(church);
      setEditorMode('edit');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pushToast('error', `Failed to load church: ${message}`);
    } finally {
      setSelectedChurchLoading(false);
    }
  }, [pushToast]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setCursorHistory([]);
    setCurrentCursor(null);
    setResults([]);
    setNextCursor(null);
    setError(null);
  }, []);

  const handleLogout = useCallback(() => {
    startLogout(async () => {
      await logoutAdmin();
        router.refresh();
    });
  }, [router]);

  const handleStartCreation = useCallback(() => {
    setSelectedChurch(null);
    setEditorMode('create');
    setCreationSeed({ name: '', country: '' });
    setSelectedChurchLoading(false);
  }, []);

  const inFlightLabel = loading ? 'Loading…' : `Showing ${results.length} result${results.length === 1 ? '' : 's'}`;

  const showPrevious = useMemo(() => cursorHistory.length > 0, [cursorHistory.length]);
  const showNext = useMemo(() => Boolean(nextCursor), [nextCursor]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Search and manage churches in the Global.Church directory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStartCreation}
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Add church
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutPending}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {logoutPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-200">Search by name or keyword</span>
            <input
              type="text"
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="e.g. Grace Church"
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-200">Locality / City</span>
            <input
              type="text"
              value={filters.locality}
              onChange={(event) => setFilters((prev) => ({ ...prev, locality: event.target.value }))}
              placeholder="e.g. Seattle"
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-200">Church ID</span>
            <input
              type="text"
              value={filters.id}
              onChange={(event) => setFilters((prev) => ({ ...prev, id: event.target.value }))}
              placeholder="UUID"
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <p>{inFlightLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePreviousPage()}
              disabled={!showPrevious || loading}
              className="rounded-md border border-slate-700 px-3 py-1.5 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => void handleNextPage()}
              disabled={!showNext || loading}
              className="rounded-md border border-slate-700 px-3 py-1.5 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50 shadow">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Locality</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Belief</th>
                <th className="px-4 py-3">Website</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Loading results…
                  </td>
                </tr>
              )}
              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No churches yet. Try adjusting your search.
                  </td>
                </tr>
              )}
              {!loading &&
                results.map((church) => {
                  const isSelected = selectedChurch?.church_id === church.church_id;
                  let websiteLabel = '—';
                  if (church.website) {
                    try {
                      const parsed = new URL(church.website);
                      websiteLabel = parsed.hostname;
                    } catch {
                      websiteLabel = church.website ?? '—';
                    }
                  }

                  return (
                    <tr
                      key={church.church_id}
                      onClick={() => void handleSelectChurch(church.church_id)}
                      className={`cursor-pointer transition hover:bg-slate-800/60 ${isSelected ? 'bg-sky-900/40' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-white">{church.name}</td>
                      <td className="px-4 py-3">{church.locality ?? '—'}</td>
                      <td className="px-4 py-3">{church.region ?? '—'}</td>
                      <td className="px-4 py-3">{church.country ?? '—'}</td>
                      <td className="px-4 py-3">{church.belief_type ?? '—'}</td>
                      <td className="px-4 py-3 text-sky-300">
                        {church.website ? (
                          <a
                            href={church.website}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="underline decoration-sky-400/60 decoration-dashed underline-offset-4 hover:text-sky-200"
                          >
                            {websiteLabel}
                          </a>
                        ) : (
                          websiteLabel
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="rounded-md border border-rose-600/60 bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <ChurchEditor
        church={selectedChurch}
        mode={editorMode === 'create' ? 'create' : selectedChurch ? 'edit' : 'idle'}
        initialValues={editorMode === 'create' ? creationSeed ?? {} : undefined}
        loading={selectedChurchLoading && editorMode !== 'create'}
        onClose={() => {
          setSelectedChurch(null);
          setEditorMode('idle');
          setCreationSeed(null);
          setSelectedChurchLoading(false);
        }}
        onSaved={(updated, mode) => {
          setSelectedChurch(updated);
          setEditorMode('edit');
          setCreationSeed(null);
          pushToast('success', mode === 'create' ? 'Church created successfully.' : 'Church updated successfully.');
          void fetchResults(mode === 'create' ? null : currentCursor);
        }}
        onError={(message) => pushToast('error', message)}
      />

      {toast && (
        <div className="pointer-events-none fixed right-6 top-6 z-50">
          <div
            className={`pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg ${
              toast.tone === 'success'
                ? 'border-emerald-500/60 bg-emerald-900/40 text-emerald-100'
                : toast.tone === 'error'
                  ? 'border-rose-500/60 bg-rose-900/40 text-rose-100'
                  : 'border-sky-500/60 bg-sky-900/40 text-sky-100'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
