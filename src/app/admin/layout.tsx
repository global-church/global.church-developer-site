import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentSession, hasRole } from '@/lib/session';
import { SessionProvider } from '@/contexts/SessionContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | Global.Church',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect('/signin');
  }

  const supabase = await createSupabaseServerComponentClient();
  const session = await getCurrentSession(supabase);

  if (!session || !hasRole(session, 'admin', 'support', 'editor')) {
    redirect('/signin');
  }

  return (
    <SessionProvider session={session}>
      <AdminSidebar session={session}>{children}</AdminSidebar>
    </SessionProvider>
  );
}
