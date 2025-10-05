import { cookies } from 'next/headers';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { ADMIN_SESSION_COOKIE, isAdminPasswordConfigured, matchesSessionSignature } from '@/lib/adminAuth';

export default function AdminPage() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = matchesSessionSignature(sessionCookie);

  if (!isAuthenticated) {
    return <AdminLoginForm envConfigured={isAdminPasswordConfigured()} />;
  }

  return <AdminDashboard />;
}
