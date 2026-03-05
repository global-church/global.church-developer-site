import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/serverAuth';
import { hasRole } from '@/lib/session';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Management | Admin | Global.Church',
};

export default async function AdminUsersPage() {
  const session = await getServerSession();

  if (!session || !hasRole(session, 'admin', 'support')) {
    redirect('/admin');
  }

  const canAssignRoles = hasRole(session, 'admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">User Management</h1>
        <p className="text-slate-400 mt-1">
          View and manage developer accounts and team roles.
        </p>
      </div>
      <AdminUsersTable canAssignRoles={canAssignRoles} />
    </div>
  );
}
