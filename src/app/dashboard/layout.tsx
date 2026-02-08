import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { getCurrentSession } from '@/lib/session';
import { SessionProvider } from '@/contexts/SessionContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard | Global.Church',
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect('/signin');
  }

  const supabase = await createSupabaseServerComponentClient();
  const session = await getCurrentSession(supabase);

  if (!session) {
    redirect('/signin');
  }

  return (
    <SessionProvider session={session}>
      <DashboardShell session={session}>{children}</DashboardShell>
    </SessionProvider>
  );
}
