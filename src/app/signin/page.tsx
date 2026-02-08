import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentSession } from '@/lib/session';
import { SignInForm } from '@/components/auth/SignInForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign In | Global.Church',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerComponentClient();
    const session = await getCurrentSession(supabase);

    if (session) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {params.error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {params.error}
          </div>
        )}
        <SignInForm redirectTo={params.redirect} />
      </div>
    </div>
  );
}
