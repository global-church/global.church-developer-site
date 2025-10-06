import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { createSupabaseServerComponentClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentAdmin } from '@/lib/adminSession';

export default async function AdminPage() {
  const supabaseConfigured = isSupabaseConfigured();

  if (!supabaseConfigured) {
    return <AdminLoginForm supabaseConfigured={false} />;
  }

  const supabase = createSupabaseServerComponentClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  let membershipError: string | null = null;
  let isAdmin = false;

  if (!sessionError && user) {
    try {
      const membership = await getCurrentAdmin(supabase);
      isAdmin = Boolean(membership);
    } catch (error) {
      membershipError = error instanceof Error ? error.message : 'Unable to verify admin membership.';
    }
  }

  if (!isAdmin) {
    return (
      <AdminLoginForm
        supabaseConfigured
        initialEmail={user?.email ?? undefined}
        membershipError={membershipError}
      />
    );
  }

  return <AdminDashboard />;
}
