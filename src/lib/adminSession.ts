import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminMembership = {
  user_id: string;
  email: string;
  role: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

type AdminListResponse = AdminMembership[] | null;

export async function listAdmins(client: SupabaseClient): Promise<AdminMembership[]> {
  const adminSchema = client.schema('api');
  const { data, error } = await adminSchema.rpc('admins_list');
  if (error) {
    throw new Error(error.message);
  }

  return (data as AdminListResponse) ?? [];
}

export async function getCurrentAdmin(client: SupabaseClient): Promise<AdminMembership | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw new Error(error.message || 'Unable to verify Supabase session.');
  }

  if (!user) {
    return null;
  }

  const admins = await listAdmins(client);
  return admins.find((admin) => admin.user_id === user.id && admin.is_active) ?? null;
}

export async function ensureActiveAdmin(client: SupabaseClient): Promise<AdminMembership> {
  const admin = await getCurrentAdmin(client);

  if (!admin) {
    throw new Error('Your account is not authorised for the admin portal.');
  }

  return admin;
}
