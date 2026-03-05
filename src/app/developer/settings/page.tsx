import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/serverAuth';
import { createServiceRoleClient } from '@/lib/supabaseServerClient';
import { ProfileForm } from '@/components/developer/ProfileForm';

export const metadata = {
  title: 'Profile | Global.Church Developer',
};

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) redirect('/signin');

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, company, website, bio')
    .eq('id', session.userId)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your profile information.</p>
      </div>
      <ProfileForm
        initial={{
          displayName: profile?.display_name ?? '',
          email: profile?.email ?? session.email,
          company: profile?.company ?? '',
          website: profile?.website ?? '',
          bio: profile?.bio ?? '',
        }}
      />
    </div>
  );
}
