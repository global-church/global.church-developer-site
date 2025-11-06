// SETUP INSTRUCTIONS:
// 
// 1. UPDATE SUPABASE REDIRECT URLS:
//    Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration
//    Under 'Redirect URLs', add:
//    - http://localhost:3000/reset-password (for local development)
//    - https://YOUR_PRODUCTION_DOMAIN/reset-password (for production)
//    Save changes.
//
// 2. UPDATE EMAIL TEMPLATE:
//    Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/templates
//    Select "Reset Password" template and replace the link with:
//
//    <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a>
//
//    This creates a clean URL with the token as a query parameter instead of a hash fragment.
//
// The password reset flow will now work correctly.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseBrowserClient } from '@/hooks/useSupabaseBrowserClient';

export const dynamic = 'force-dynamic';

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

type PasswordStrength = {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();

  const [tokens, setTokens] = useState<RecoveryTokens | null>(null);
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Parse tokens from URL (both hash and query params) on mount
  useEffect(() => {
    // First, check for token_hash in query params (preferred method)
    const searchParams = new URLSearchParams(window.location.search);
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (tokenHash && type === 'recovery') {
      // Use token_hash approach - we'll verify with Supabase directly
      // Set a flag that we're using token_hash method
      setTokens({ accessToken: tokenHash, refreshToken: '' }); // Store token_hash in accessToken field as marker
      return;
    }

    // Fallback: check hash fragments (legacy/fallback method)
    const parseHashParams = (): RecoveryTokens | null => {
      const hash = window.location.hash.substring(1); // Remove leading #
      if (!hash) return null;

      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const hashType = params.get('type');

      // Verify this is a recovery flow
      if (hashType !== 'recovery' || !accessToken || !refreshToken) {
        return null;
      }

      return { accessToken, refreshToken };
    };

    const recoveryTokens = parseHashParams();

    if (!recoveryTokens) {
      setError('Invalid or missing recovery token. Please request a new password reset link.');
      setInitializing(false);
      return;
    }

    setTokens(recoveryTokens);
  }, []);

  // Establish session with recovery tokens
  useEffect(() => {
    if (!tokens || sessionEstablished) return;

    const establishSession = async () => {
      try {
        // Check if we're using token_hash method (no refresh_token means token_hash)
        const usingTokenHash = !tokens.refreshToken;

        if (usingTokenHash) {
          // Verify OTP with token_hash
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokens.accessToken,
            type: 'recovery',
          });

          if (verifyError) {
            console.error('Token verification error:', verifyError);
            setError(
              verifyError.message.includes('expired') || verifyError.message.includes('invalid')
                ? 'This password reset link has expired or is invalid. Please request a new one.'
                : verifyError.message || 'Unable to verify your reset token. Please request a new password reset link.'
            );
            setInitializing(false);
            return;
          }
        } else {
          // Use access_token/refresh_token method (legacy)
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(
              sessionError.message.includes('expired')
                ? 'This password reset link has expired. Please request a new one.'
                : 'Unable to verify your reset token. Please request a new password reset link.'
            );
            setInitializing(false);
            return;
          }
        }

        setSessionEstablished(true);
        setInitializing(false);

        // Clear tokens from URL for security
        window.history.replaceState(null, '', window.location.pathname);
      } catch (err) {
        console.error('Unexpected error establishing session:', err);
        setError('An unexpected error occurred. Please try again.');
        setInitializing(false);
      }
    };

    establishSession();
  }, [tokens, sessionEstablished, supabase]);

  // Password strength validation
  const passwordStrength: PasswordStrength = useMemo(() => {
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

    return { isValid, hasMinLength, hasUppercase, hasLowercase, hasNumber };
  }, [newPassword]);

  const passwordsMatch = useMemo(
    () => newPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  const canSubmit = useMemo(
    () => sessionEstablished && passwordStrength.isValid && passwordsMatch && !pending,
    [sessionEstablished, passwordStrength.isValid, passwordsMatch, pending]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!canSubmit) return;

      setError(null);
      setPending(true);

      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          // Handle specific error types
          if ((updateError as { name?: string })?.name === 'AuthSessionMissingError') {
            setError('Your session has expired. Please request a new password reset link.');
            setPending(false);
            return;
          }

          if (
            (updateError as { name?: string; code?: string })?.name === 'AuthWeakPasswordError' ||
            updateError.code === 'weak_password'
          ) {
            setError(updateError.message || 'Password does not meet the strength requirements.');
            setPending(false);
            return;
          }

          setError(updateError.message || 'Unable to update password. Please try again.');
          setPending(false);
          return;
        }

        // Success
        setSuccess(true);
        setPending(false);

        // Redirect to admin portal after brief delay
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } catch (err) {
        console.error('Password update error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        setPending(false);
      }
    },
    [canSubmit, newPassword, supabase, router]
  );

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-white">Reset Password</h1>
            <p className="text-sm text-slate-300">Verifying your reset link…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !sessionEstablished) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-white">Reset Password</h1>
            <p className="text-sm text-rose-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/60"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-white">Password Updated</h1>
            <p className="text-sm text-emerald-400">
              Your password has been successfully updated. Redirecting to admin portal…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Reset Password</h1>
          <p className="text-sm text-slate-300">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-200">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={pending}
              required
            />
          </label>

          {/* Password strength indicator */}
          {newPassword.length > 0 && (
            <div className="space-y-2 rounded-md border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-xs font-medium text-slate-300">Password Requirements:</p>
              <ul className="space-y-1 text-xs">
                <li className={passwordStrength.hasMinLength ? 'text-emerald-400' : 'text-slate-400'}>
                  {passwordStrength.hasMinLength ? '✓' : '○'} At least 8 characters
                </li>
                <li className={passwordStrength.hasUppercase ? 'text-emerald-400' : 'text-slate-400'}>
                  {passwordStrength.hasUppercase ? '✓' : '○'} One uppercase letter
                </li>
                <li className={passwordStrength.hasLowercase ? 'text-emerald-400' : 'text-slate-400'}>
                  {passwordStrength.hasLowercase ? '✓' : '○'} One lowercase letter
                </li>
                <li className={passwordStrength.hasNumber ? 'text-emerald-400' : 'text-slate-400'}>
                  {passwordStrength.hasNumber ? '✓' : '○'} One number
                </li>
              </ul>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-200">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={pending}
              required
            />
          </label>

          {/* Password match indicator */}
          {confirmPassword.length > 0 && (
            <p
              className={`text-xs ${
                passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {pending ? 'Updating Password…' : 'Reset Password'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="text-sm text-slate-400 transition hover:text-slate-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

