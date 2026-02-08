import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabaseServerClient';
import { getCurrentSession } from '@/lib/session';
import { ProfileForm } from '@/components/dashboard/ProfileForm';

export const metadata = {
  title: 'Profile | Global.Church Dashboard',
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerComponentClient();
  const session = await getCurrentSession(supabase);

  if (!session) redirect('/signin');

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
