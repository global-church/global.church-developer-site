'use client';

import { useActionState } from 'react';
import { authenticateAdmin, type LoginFormState } from '@/app/admin/actions';

const initialState: LoginFormState = { success: false, error: null, email: null, message: null };

type AdminLoginFormProps = {
  supabaseConfigured: boolean;
  initialEmail?: string;
  membershipError?: string | null;
};

export function AdminLoginForm({ supabaseConfigured, initialEmail, membershipError }: AdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(authenticateAdmin, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Admin Access</h1>
          <p className="text-sm text-slate-300">
            Sign in with your email to access the admin portal.
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

        {state.success ? (
          <div className="rounded-md border border-emerald-700 bg-emerald-900/40 p-4 text-center space-y-2">
            <p className="text-sm font-medium text-emerald-300">
              {state.message ?? 'Check your email for a sign-in link.'}
            </p>
            <p className="text-xs text-emerald-400">
              We sent a link to <strong>{state.email}</strong>
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={state.email ?? initialEmail ?? ''}
                className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={!supabaseConfigured || isPending}
                required
              />
            </label>

            {state.error && !state.success && (
              <p className="text-sm text-rose-400">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={!supabaseConfigured || isPending}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isPending ? 'Sending link...' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
