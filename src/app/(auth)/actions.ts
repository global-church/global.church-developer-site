'use server';

import { createSupabaseServerActionClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentSession } from '@/lib/session';

export type AuthFormState = {
  success: boolean;
  error?: string | null;
  email?: string | null;
  message?: string | null;
};

export async function signInWithMagicLink(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Authentication is not configured.' };
  }

  const rawEmail = formData.get('email');

  if (!rawEmail || typeof rawEmail !== 'string') {
    return { success: false, error: 'Email is required.' };
  }

  const email = rawEmail.trim().toLowerCase();

  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message, email };
  }

  return {
    success: true,
    email,
    message: 'Check your email for a sign-in link.',
  };
}

export async function signUp(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Authentication is not configured.' };
  }

  const rawEmail = formData.get('email');
  const rawName = formData.get('name');
  const rawCompany = formData.get('company');

  if (!rawEmail || typeof rawEmail !== 'string') {
    return { success: false, error: 'Email is required.' };
  }

  const email = rawEmail.trim().toLowerCase();
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const company = typeof rawCompany === 'string' ? rawCompany.trim() : '';

  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        full_name: name,
        company,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message, email };
  }

  return {
    success: true,
    email,
    message: 'Check your email for a sign-in link to complete registration.',
  };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createSupabaseServerActionClient();
  await supabase.auth.signOut({ scope: 'local' });
}

export async function getRedirectForUser(): Promise<string> {
  if (!isSupabaseConfigured()) return '/';
  const supabase = await createSupabaseServerActionClient();
  const session = await getCurrentSession(supabase);
  if (!session) return '/';
  if (session.roles.length > 0) return '/admin';
  return '/developer';
}
