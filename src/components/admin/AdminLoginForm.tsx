'use client';

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdmin, type LoginFormState } from '@/app/admin/actions';

const initialState: LoginFormState = { success: false, error: null, mfaTicket: null, email: null };

type AdminLoginFormProps = {
  supabaseConfigured: boolean;
  initialEmail?: string;
  membershipError?: string | null;
};

export function AdminLoginForm({ supabaseConfigured, initialEmail, membershipError }: AdminLoginFormProps) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState(authenticateAdmin, initialState);
  const [transitionPending, startTransition] = useTransition();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (state.email && state.email !== email) {
      setEmail(state.email);
    }
  }, [email, state.email]);

  const requiresOtp = useMemo(() => Boolean(state.mfaTicket), [state.mfaTicket]);

  useEffect(() => {
    if (state.success) {
      startTransition(async () => {
        router.refresh();
      });
    }
  }, [router, startTransition, state.success]);

  useEffect(() => {
    if (!requiresOtp) {
      setOtp('');
    }
  }, [requiresOtp]);

  const resetLogin = useCallback(() => {
    setPassword('');
    setOtp('');
    startTransition(async () => {
      router.refresh();
    });
  }, [router, startTransition]);

  const disabled = !supabaseConfigured || actionPending || transitionPending;
  const submitLabel = requiresOtp ? 'Verify Code' : 'Sign In';

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Admin Access</h1>
          <p className="text-sm text-slate-300">
            {requiresOtp ? 'Enter the 6-digit code from your authenticator app.' : 'Sign in with your Supabase admin account.'}
          </p>
          {!supabaseConfigured && (
            <p className="text-sm text-amber-400">
              Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </p>
          )}
          {membershipError && (
            <p className="text-sm text-amber-400">{membershipError}</p>
          )}
        </div>

        <form action={formAction} className="space-y-4">
          {requiresOtp ? (
            <input type="hidden" name="mfa_ticket" value={state.mfaTicket ?? ''} />
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-200">Email</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={disabled || requiresOtp}
              required
            />
          </label>

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
              disabled={disabled || requiresOtp}
              required={!requiresOtp}
            />
          </label>

          {requiresOtp && (
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-200">Authenticator Code</span>
              <input
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="123456"
                autoComplete="one-time-code"
                disabled={disabled}
                required
              />
            </label>
          )}

          {state.error && !state.success && (
            <p className="text-sm text-rose-400">{state.error}</p>
          )}

          <div className="space-y-2">
            <button
              type="submit"
              disabled={disabled || (!supabaseConfigured && !requiresOtp)}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {actionPending ? 'Verifying…' : submitLabel}
            </button>

            {requiresOtp && (
              <button
                type="button"
                onClick={resetLogin}
                className="inline-flex w-full items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/60"
              >
                Start over
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
