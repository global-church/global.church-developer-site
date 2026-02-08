'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInWithMagicLink, type AuthFormState } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OAuthButton } from './OAuthButton';

const initialState: AuthFormState = { success: false };

export function SignInForm({ redirectTo: _redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(signInWithMagicLink, initialState);

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-gray-500">
          Sign in to your Global.Church account
        </p>
      </div>

      <OAuthButton provider="github" />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">or</span>
        </div>
      </div>

      {state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
          <p className="text-sm font-medium text-emerald-800">
            {state.message ?? 'Check your email for a sign-in link.'}
          </p>
          <p className="text-xs text-emerald-600">
            We sent a link to <strong>{state.email}</strong>
          </p>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              defaultValue={state.email ?? ''}
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Sending link...' : 'Send sign-in link'}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
