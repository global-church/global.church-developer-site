'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdmin, type LoginFormState } from '@/app/admin/actions';

const initialState: LoginFormState = { success: false, error: null };

export function AdminLoginForm({ envConfigured }: { envConfigured: boolean }) {
  const router = useRouter();
  const [state, formAction] = useActionState(authenticateAdmin, initialState);
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (state.success) {
      startTransition(async () => {
        router.refresh();
      });
    }
  }, [router, state.success, startTransition]);

  const disabled = pending || !envConfigured;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Admin Access</h1>
          <p className="text-sm text-slate-300">
            Enter the admin password to continue.
          </p>
          {!envConfigured && (
            <p className="text-sm text-amber-400">
              Admin password is not configured. Set ADMIN_PORTAL_PASSWORD in your environment.
            </p>
          )}
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-200">Password</span>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={disabled}
              required
            />
          </label>

          {state.error && !state.success && (
            <p className="text-sm text-rose-400">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {pending ? 'Verifying…' : 'Unlock Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
