import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabaseServerClient';
import { getCurrentSession, hasRole } from '@/lib/session';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Management | Admin | Global.Church',
};

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerComponentClient();
  const session = await getCurrentSession(supabase);

  // Layout already ensures user has a role, but this page needs admin or support specifically
  if (!session || !hasRole(session, 'admin', 'support')) {
    redirect('/admin');
  }

  const canAssignRoles = hasRole(session, 'admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-slate-400 mt-1">
          View and manage developer accounts and team roles.
        </p>
      </div>
      <AdminUsersTable canAssignRoles={canAssignRoles} />
    </div>
  );
}
