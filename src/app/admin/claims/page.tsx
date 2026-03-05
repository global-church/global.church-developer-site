import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/serverAuth';
import { hasRole } from '@/lib/session';
import { ClaimsReview } from '@/components/admin/ClaimsReview';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Claims | Admin | Global.Church',
};

export default async function ClaimsPage() {
  const session = await getServerSession();

  if (!session || !hasRole(session, 'admin', 'support')) {
    redirect('/admin');
  }

  return <ClaimsReview />;
}
