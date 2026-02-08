'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp, type AuthFormState } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OAuthButton } from './OAuthButton';

const initialState: AuthFormState = { success: false };

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-gray-500">
          Get API access to the Global.Church Index
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
            {state.message ?? 'Check your email to complete registration.'}
          </p>
          <p className="text-xs text-emerald-600">
            We sent a link to <strong>{state.email}</strong>
          </p>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

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

          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">
              Company / Organization{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Input
              id="company"
              name="company"
              type="text"
              placeholder="Acme Inc."
              autoComplete="organization"
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Sending link...' : 'Create account'}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/signin" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
