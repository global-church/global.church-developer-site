import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/serverAuth';
import { hasRole } from '@/lib/session';
import { SessionProvider } from '@/contexts/SessionContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | Global.Church',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session || !hasRole(session, 'admin', 'support', 'editor')) {
    redirect('/signin');
  }

  return (
    <SessionProvider session={session}>
      <AdminSidebar session={session}>{children}</AdminSidebar>
    </SessionProvider>
  );
}
