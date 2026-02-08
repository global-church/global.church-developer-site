'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { searchChurches, getChurchById } from '@/lib/zuplo';
import type { ChurchPublic } from '@/lib/types';
import { fetchAdminChurchesByStatus, getAdminChurchById } from '@/app/admin/actions';
import { ChurchEditor } from './ChurchEditor';

type AdminTab = 'public' | 'needs_review' | 'rejected';

const TAB_LABELS: Record<AdminTab, string> = {
  public: 'Public API',
  needs_review: 'Under Review',
  rejected: 'Rejected',
};

const TAB_DESCRIPTIONS: Record<AdminTab, string> = {
  public: 'Search the live Zuplo-powered API to confirm what the public explorer returns.',
  needs_review: 'Review churches awaiting approval directly from Supabase using service role access.',
  rejected: 'Browse churches that have been rejected to verify details or reverse decisions.',
};

const REVIEW_FIELD_KEYS: Array<keyof ChurchPublic> = [
  'name',
  'admin_status',
  'admin_notes',
  'belief_type',
  'trinitarian',
  'logo_url',
  'logo_width',
  'logo_height',
  'logo_aspect_ratio',
  'banner_url',
  'banner_width',
  'banner_height',
  'banner_aspect_ratio',
  'address',
  'locality',
  'region',
  'postal_code',
  'country',
  'latitude',
  'longitude',
];

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

type TabState = {
  filters: SearchFilters;
  results: ChurchPublic[];
  loading: boolean;
  error: string | null;
  currentCursor: string | null;
  nextCursor: string | null;
  cursorHistory: (string | null)[];
  count: number | null;
  hasLoaded: boolean;
};

const createTabState = (): TabState => ({
  filters: { ...DEFAULT_FILTERS },
  results: [],
  loading: false,
  error: null,
  currentCursor: null,
  nextCursor: null,
  cursorHistory: [],
  count: null,
  hasLoaded: false,
});

const TABS: AdminTab[] = ['public', 'needs_review', 'rejected'];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('public');
  const [tabStateByTab, setTabStateByTab] = useState<Record<AdminTab, TabState>>({
    public: createTabState(),
    needs_review: createTabState(),
    rejected: createTabState(),
  });
  const tabStateRef = useRef(tabStateByTab);
  useEffect(() => {
    tabStateRef.current = tabStateByTab;
  }, [tabStateByTab]);

  const isReviewTab = activeTab === 'needs_review' || activeTab === 'rejected';

  const [selectedChurch, setSelectedChurch] = useState<ChurchPublic | null>(null);
  const [selectedChurchLoading, setSelectedChurchLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<'idle' | 'edit' | 'create'>('idle');
  const [creationSeed, setCreationSeed] = useState<Partial<ChurchPublic> | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    setToast({ id: Date.now(), tone, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === toast.id ? null : prev));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateTabState = useCallback((tab: AdminTab, updater: (state: TabState) => TabState) => {
    setTabStateByTab((prev) => {
      const previous = prev[tab];
      const next = updater(previous);
      if (next === previous) {
        return prev;
      }
      return { ...prev, [tab]: next };
    });
  }, []);

  const loadTabResults = useCallback(async (tab: AdminTab, cursor: string | null, options?: { resetHistory?: boolean }) => {
    const snapshot = tabStateRef.current[tab];
    const filters = { ...snapshot.filters };

    updateTabState(tab, (state) => ({
      ...state,
      loading: true,
      error: null,
      ...(options?.resetHistory ? { cursorHistory: [], currentCursor: null } : {}),
    }));

    try {
      if (tab === 'public') {
        const response = await searchChurches({
          q: filters.query || undefined,
          locality: filters.locality || undefined,
          id: filters.id || undefined,
          limit: PAGE_SIZE,
          cursor: cursor ?? undefined,
        });

        updateTabState(tab, (state) => ({
          ...state,
          loading: false,
          results: response.items,
          currentCursor: cursor,
          nextCursor: response.nextCursor ?? null,
          error: null,
          hasLoaded: true,
        }));
        return;
      }

      const response = await fetchAdminChurchesByStatus({
        status: tab,
        limit: PAGE_SIZE,
        cursor: cursor ?? undefined,
        query: filters.query || undefined,
        locality: filters.locality || undefined,
        id: filters.id || undefined,
      });

      updateTabState(tab, (state) => ({
        ...state,
        loading: false,
        results: response.items,
        currentCursor: cursor,
        nextCursor: response.nextCursor,
        error: null,
        count: response.count,
        hasLoaded: true,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateTabState(tab, (state) => ({
        ...state,
        loading: false,
        results: [],
        currentCursor: cursor,
        nextCursor: null,
        error: message,
        hasLoaded: true,
        count: tab === 'public' ? state.count : null,
      }));
    }
  }, [updateTabState]);

  const handleSearch = useCallback(() => {
    void loadTabResults(activeTab, null, { resetHistory: true });
  }, [activeTab, loadTabResults]);

  const handleNextPage = useCallback(() => {
    const state = tabStateRef.current[activeTab];
    if (!state.nextCursor) return;
    updateTabState(activeTab, (prev) => ({
      ...prev,
      cursorHistory: [...prev.cursorHistory, prev.currentCursor],
    }));
    void loadTabResults(activeTab, state.nextCursor);
  }, [activeTab, loadTabResults, updateTabState]);

  const handlePreviousPage = useCallback(() => {
    const state = tabStateRef.current[activeTab];
    if (!state.cursorHistory.length) return;
    const history = state.cursorHistory;
    const previousCursor = history[history.length - 1] ?? null;
    updateTabState(activeTab, (prev) => ({
      ...prev,
      cursorHistory: prev.cursorHistory.slice(0, -1),
    }));
    void loadTabResults(activeTab, previousCursor);
  }, [activeTab, loadTabResults, updateTabState]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    updateTabState(activeTab, (state) => ({
      ...state,
      filters: { ...state.filters, [key]: value },
    }));
  }, [activeTab, updateTabState]);

  const handleResetFilters = useCallback(() => {
    updateTabState(activeTab, () => createTabState());
  }, [activeTab, updateTabState]);

  const handleStartCreation = useCallback(() => {
    setSelectedChurch(null);
    setEditorMode('create');
    setCreationSeed({ name: '', country: '', admin_status: 'needs_review' });
    setSelectedChurchLoading(false);
  }, []);

  const handleSelectChurch = useCallback(async (church: ChurchPublic) => {
    setSelectedChurchLoading(true);
    if (activeTab !== 'public') {
      setSelectedChurch(church);
      setEditorMode('edit');
    } else {
      setSelectedChurch(null);
      setEditorMode('idle');
    }

    try {
      const loaded = activeTab === 'public'
        ? await getChurchById(church.church_id)
        : await getAdminChurchById(church.church_id);

      if (!loaded) {
        pushToast('error', 'Unable to load church details.');
        return;
      }
      setSelectedChurch(loaded);
      setEditorMode('edit');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pushToast('error', `Failed to load church: ${message}`);
    } finally {
      setSelectedChurchLoading(false);
    }
  }, [activeTab, pushToast]);

  useEffect(() => {
    if (activeTab === 'public') return;
    const state = tabStateRef.current[activeTab];
    if (!state.hasLoaded && !state.loading) {
      void loadTabResults(activeTab, null, { resetHistory: true });
    }
  }, [activeTab, loadTabResults]);

  useEffect(() => {
    setSelectedChurch(null);
    setEditorMode('idle');
    setCreationSeed(null);
    setSelectedChurchLoading(false);
  }, [activeTab]);

  const activeState = tabStateByTab[activeTab];
  const filters = activeState.filters;
  const results = activeState.results;
  const showPrevious = activeState.cursorHistory.length > 0;
  const showNext = Boolean(activeState.nextCursor);
  const countSuffix = activeTab !== 'public' && activeState.count != null ? ` of ${activeState.count}` : '';
  const inFlightLabel = activeState.loading
    ? 'Loading…'
    : activeState.hasLoaded
      ? `Showing ${results.length} result${results.length === 1 ? '' : 's'}${countSuffix}`
      : 'Use the filters to load churches.';

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Churches</h1>
          <p className="mt-1 text-sm text-slate-400">
            Search and manage churches across the Global.Church datasets.
          </p>
        </div>
        <button
          type="button"
          onClick={handleStartCreation}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Add church
        </button>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            const tabCount = tab !== 'public' ? tabStateByTab[tab].count : null;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'border-sky-500 bg-slate-800 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span>{TAB_LABELS[tab]}</span>
                {tabCount != null && (
                  <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                    {tabCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-slate-300">{TAB_DESCRIPTIONS[activeTab]}</p>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-200">Search by name or keyword</span>
            <input
              type="text"
              value={filters.query}
              onChange={(event) => handleFilterChange('query', event.target.value)}
              placeholder="e.g. Grace Church"
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-200">Filter by locality</span>
            <input
              type="text"
              value={filters.locality}
              onChange={(event) => handleFilterChange('locality', event.target.value)}
              placeholder="e.g. London"
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-200">Search by church ID</span>
            <input
              type="text"
              value={filters.id}
              onChange={(event) => handleFilterChange('id', event.target.value)}
              placeholder="e.g. church_123"
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <span>{inFlightLabel}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={!showPrevious || activeState.loading}
              className="rounded-md border border-slate-700 px-3 py-1.5 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!showNext || activeState.loading}
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
              {activeState.loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Loading results…
                  </td>
                </tr>
              )}
              {!activeState.loading && results.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No churches yet. Try adjusting your search.
                  </td>
                </tr>
              )}
              {!activeState.loading &&
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
                      onClick={() => void handleSelectChurch(church)}
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

        {activeState.error && (
          <div className="rounded-md border border-rose-600/60 bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
            {activeState.error}
          </div>
        )}
      </section>

      <ChurchEditor
        church={selectedChurch}
        mode={editorMode === 'create' ? 'create' : selectedChurch ? 'edit' : 'idle'}
        initialValues={editorMode === 'create' ? creationSeed ?? {} : undefined}
        loading={selectedChurchLoading && editorMode !== 'create'}
        visibleFieldKeys={editorMode === 'edit' && isReviewTab ? REVIEW_FIELD_KEYS : undefined}
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
          const state = tabStateRef.current[activeTab];
          const shouldReset = mode === 'create';
          const cursor = shouldReset ? null : state.currentCursor;
          void loadTabResults(activeTab, cursor, shouldReset ? { resetHistory: true } : undefined);
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
