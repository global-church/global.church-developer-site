'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { searchChurches, getChurchById } from '@/lib/zuplo';
import type { ChurchPublic } from '@/lib/types';
import { fetchAdminChurchesByStatus, getAdminChurchById } from '@/app/admin/actions';
import { useSupabaseBrowserClient } from '@/hooks/useSupabaseBrowserClient';
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

function deriveInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name
      .split(/\s+/)
      .filter((part) => part.trim().length > 0);
    if (parts.length >= 2) {
      return `${parts[0]![0]!.toUpperCase()}${parts[1]![0]!.toUpperCase()}`;
    }
    if (parts.length === 1) {
      const first = parts[0]!
        .trim()
        .replace(/[^A-Za-z0-9]/g, '');
      if (first.length >= 2) {
        return `${first[0]!.toUpperCase()}${first[1]!.toUpperCase()}`;
      }
      if (first.length === 1) {
        return `${first[0]!.toUpperCase()}${first[0]!.toUpperCase()}`;
      }
    }
  }

  if (email) {
    const clean = email.replace(/[^A-Za-z0-9]/g, '');
    if (clean.length >= 2) {
      return clean.slice(0, 2).toUpperCase();
    }
    if (clean.length === 1) {
      const letter = clean[0]!.toUpperCase();
      return `${letter}${letter}`;
    }
  }

  return 'AD';
}

export function AdminDashboard() {
  const router = useRouter();
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

  const supabase = useSupabaseBrowserClient();
  const [profile, setProfile] = useState<{ email: string; fullName: string | null } | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const changePasswordButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const redirectToLogin = useCallback(() => {
    setAccountMenuOpen(false);
    setChangePasswordOpen(false);
    setSignOutPending(false);
    setPasswordPending(false);
    router.replace('/login');
  }, [router]);

  const profileLabel = profile?.fullName ?? profile?.email ?? 'Admin user';
  const avatarInitials = useMemo(
    () => deriveInitials(profile?.fullName ?? null, profile?.email ?? null),
    [profile?.email, profile?.fullName],
  );

  const passwordRules = useMemo(
    () => ({
      length: newPassword.length >= 12,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      symbol: /[^A-Za-z0-9]/.test(newPassword),
    }),
    [newPassword],
  );

  const passwordChecklist = useMemo(
    () => [
      { key: 'length', label: 'At least 12 characters', met: passwordRules.length },
      { key: 'uppercase', label: 'Contains an uppercase letter', met: passwordRules.uppercase },
      { key: 'lowercase', label: 'Contains a lowercase letter', met: passwordRules.lowercase },
      { key: 'number', label: 'Includes a number', met: passwordRules.number },
      { key: 'symbol', label: 'Includes a symbol', met: passwordRules.symbol },
    ],
    [passwordRules],
  );

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const meetsStrength = passwordChecklist.every((item) => item.met);
  const canSubmitPassword = meetsStrength && passwordsMatch && !passwordPending;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

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

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error || !data.user) {
        redirectToLogin();
        return;
      }

      setProfile({
        email: data.user.email ?? '',
        fullName: (data.user.user_metadata?.full_name as string | null) ?? null,
      });
    })();

    return () => {
      active = false;
    };
  }, [redirectToLogin, supabase]);

  const closeChangePassword = useCallback(() => {
    setChangePasswordOpen(false);
    setPasswordPending(false);
    setPasswordError(null);
    setNewPassword('');
    setConfirmPassword('');

    const target = lastFocusedRef.current ?? accountButtonRef.current;
    if (target) {
      window.requestAnimationFrame(() => {
        target.focus();
      });
    }
    lastFocusedRef.current = null;
  }, []);

  const openChangePassword = useCallback(() => {
    lastFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    setAccountMenuOpen(false);
    setPasswordError(null);
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordOpen(true);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuContainerRef.current?.contains(target) ||
        accountButtonRef.current?.contains(target)
      ) {
        return;
      }
      setAccountMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      changePasswordButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!changePasswordOpen) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [changePasswordOpen]);

  useEffect(() => {
    if (!changePasswordOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!modalRef.current) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeChangePassword();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [changePasswordOpen, closeChangePassword]);

  const handleSignOut = useCallback(async () => {
    if (signOutPending) {
      return;
    }

    setSignOutPending(true);
    setAccountMenuOpen(false);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if ((error as { name?: string })?.name === 'AuthSessionMissingError') {
          redirectToLogin();
          return;
        }
        const message = error.message || 'Unable to sign out.';
        setSignOutPending(false);
        pushToast('error', message);
        return;
      }

      redirectToLogin();
    } catch (err) {
      setSignOutPending(false);
      const message = err instanceof Error ? err.message : 'Unable to sign out.';
      pushToast('error', message);
    }
  }, [pushToast, redirectToLogin, signOutPending, supabase]);

  const handlePasswordSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordPending) {
      return;
    }

    if (!meetsStrength) {
      setPasswordError('Password does not meet the strength requirements.');
      return;
    }

    if (!passwordsMatch) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordPending(true);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        if ((error as { name?: string })?.name === 'AuthSessionMissingError') {
          setPasswordPending(false);
          setPasswordError('Session expired. Redirecting to login…');
          window.setTimeout(() => {
            redirectToLogin();
          }, 1200);
          return;
        }

        if ((error as { name?: string; code?: string })?.name === 'AuthWeakPasswordError' || error.code === 'weak_password') {
          setPasswordPending(false);
          setPasswordError(error.message || 'Password does not meet the strength requirements.');
          return;
        }

        const message = error.message || 'Unable to update password. Please try again.';
        setPasswordPending(false);
        setPasswordError(message);
        pushToast('error', message);
        return;
      }

      setPasswordPending(false);
      closeChangePassword();
      pushToast('success', 'Password updated.');
    } catch (err) {
      setPasswordPending(false);
      const message = err instanceof Error ? err.message : 'Unable to update password. Please try again.';
      setPasswordError(message);
      pushToast('error', message);
    }
  }, [closeChangePassword, meetsStrength, newPassword, passwordPending, passwordsMatch, pushToast, redirectToLogin, supabase]);

  const handleModalOverlayClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeChangePassword();
    }
  }, [closeChangePassword]);

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Search and manage churches across the Global.Church datasets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStartCreation}
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Add church
          </button>
          <div className="relative">
            <button
              type="button"
              ref={accountButtonRef}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-controls="admin-account-menu"
              aria-label={`Account menu for ${profileLabel}`}
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-base font-semibold text-white">
                {avatarInitials}
              </span>
              <svg
                className={`h-4 w-4 text-slate-300 transition ${accountMenuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.195l3.71-3.964a.75.75 0 1 1 1.08 1.04l-4.25 4.54a.75.75 0 0 1-1.08 0l-4.25-4.54a.75.75 0 0 1 .02-1.06z" />
              </svg>
            </button>

            {accountMenuOpen && (
              <div
                id="admin-account-menu"
                ref={menuContainerRef}
                role="menu"
                className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-950/95 p-1 shadow-xl backdrop-blur"
              >
                <button
                  type="button"
                  ref={changePasswordButtonRef}
                  role="menuitem"
                  onClick={openChangePassword}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/80 focus:outline-none focus-visible:bg-slate-800/80"
                >
                  Change password
                </button>
                <div className="mx-2 my-1 h-px bg-slate-800" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={signOutPending}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/80 focus:outline-none focus-visible:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signOutPending ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
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

      {changePasswordOpen && typeof window !== 'undefined'
        ? createPortal(
            (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
                role="presentation"
                onClick={handleModalOverlayClick}
              >
                <div
                  ref={modalRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="change-password-title"
                  className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 id="change-password-title" className="text-xl font-semibold text-white">
                        Change password
                      </h2>
                      <p className="mt-1 text-sm text-slate-300">
                        Create a strong password to secure your admin account.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeChangePassword}
                      className="rounded-md border border-transparent p-1 text-slate-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                      aria-label="Close change password dialog"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit}>
                    <div className="space-y-2">
                      <label className="block space-y-1">
                        <span className="text-sm font-medium text-slate-200">New password</span>
                        <input
                          ref={passwordInputRef}
                          type="password"
                          name="new-password"
                          value={newPassword}
                          onChange={(event) => {
                            setNewPassword(event.target.value);
                            setPasswordError(null);
                          }}
                          className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                          autoComplete="new-password"
                          required
                          disabled={passwordPending}
                        />
                      </label>
                      <div className="rounded-md border border-slate-800/70 bg-slate-900/80 p-3">
                        <p className="text-xs font-medium text-slate-300">Password requirements</p>
                        <ul className="mt-2 space-y-1 text-xs">
                          {passwordChecklist.map((item) => (
                            <li
                              key={item.key}
                              className={`flex items-center gap-2 ${item.met ? 'text-emerald-300' : 'text-slate-400'}`}
                            >
                              <span
                                aria-hidden
                                className={`inline-flex h-2 w-2 rounded-full ${item.met ? 'bg-emerald-400' : 'bg-slate-600'}`}
                              />
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-200">Confirm new password</span>
                      <input
                        type="password"
                        name="confirm-password"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setPasswordError(null);
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        autoComplete="new-password"
                        required
                        disabled={passwordPending}
                        aria-invalid={showPasswordMismatch || Boolean(passwordError)}
                      />
                    </label>

                    {showPasswordMismatch && (
                      <p className="text-sm text-amber-300" role="alert">
                        Passwords do not match.
                      </p>
                    )}

                    {passwordError && (
                      <p className="text-sm text-rose-300" role="alert">
                        {passwordError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={closeChangePassword}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                        disabled={passwordPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!canSubmitPassword}
                        className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700"
                      >
                        {passwordPending ? 'Updating…' : 'Update password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ),
            document.body,
          )
        : null}

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
