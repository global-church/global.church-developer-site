import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { createSupabaseServerComponentClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentAdmin } from '@/lib/adminSession';

export default async function LoginPage() {
  const supabaseConfigured = isSupabaseConfigured();

  if (!supabaseConfigured) {
    return <AdminLoginForm supabaseConfigured={false} />;
  }

  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  let membershipError: string | null = null;

  if (!error && user) {
    try {
      const membership = await getCurrentAdmin(supabase);
      if (membership) {
        redirect('/admin');
      }
      membershipError = 'Your account is not authorised for the admin portal.';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to verify admin membership.';
      membershipError = message;
    }
  }

  return (
    <AdminLoginForm
      supabaseConfigured
      initialEmail={user?.email ?? undefined}
      membershipError={membershipError}
    />
  );
}
