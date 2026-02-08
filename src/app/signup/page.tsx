import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentSession } from '@/lib/session';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign Up | Global.Church',
};

export default async function SignUpPage() {
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
        <SignUpForm />
      </div>
    </div>
  );
}
