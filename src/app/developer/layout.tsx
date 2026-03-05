import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/serverAuth';
import { SessionProvider } from '@/contexts/SessionContext';
import { DashboardShell } from '@/components/developer/DashboardShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Developer | Global.Church',
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/signin');
  }

  return (
    <SessionProvider session={session}>
      <DashboardShell session={session}>{children}</DashboardShell>
    </SessionProvider>
  );
}
