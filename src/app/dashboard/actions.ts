'use server';

import { createSupabaseServerActionClient, isSupabaseConfigured } from '@/lib/supabaseServerClient';
import { ensureAuthenticated } from '@/lib/session';
import {
  createZuploConsumerWithKey,
  createZuploApiKey,
  deleteZuploApiKey,
  getZuploConsumer,
} from '@/lib/zuploAdmin';

const MAX_KEYS_PER_USER = 5;

export type ApiKeyRecord = {
  id: string;
  label: string;
  key_hint: string;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
};

export type CreateKeyResult = {
  success: boolean;
  apiKey?: string;
  keyHint?: string;
  error?: string;
};

function consumerName(userId: string): string {
  return `dev-${userId.slice(0, 8)}`;
}

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function createApiKey(label: string): Promise<CreateKeyResult> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Service not configured.' };
    }

    const supabase = await createSupabaseServerActionClient();
    const session = await ensureAuthenticated(supabase);

    if (!session.apiAccessApproved) {
      return { success: false, error: 'Your account has not been approved for API access yet.' };
    }

    // Check key limit
    const { count } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .eq('is_active', true);

    if ((count ?? 0) >= MAX_KEYS_PER_USER) {
      return {
        success: false,
        error: `You can have at most ${MAX_KEYS_PER_USER} active API keys. Revoke an existing key first.`,
      };
    }

    const name = consumerName(session.userId);
    const keyLabel = label.trim() || 'Default';

    // Check if consumer already exists
    const existing = await getZuploConsumer(name);
    let consumerId: string;
    let keyId: string;
    let apiKey: string;

    if (existing) {
      // Consumer exists, create additional key
      consumerId = existing.id;
      const result = await createZuploApiKey(name, keyLabel);
      keyId = result.keyId;
      apiKey = result.apiKey;
    } else {
      // Create new consumer with first key
      const result = await createZuploConsumerWithKey(name, `Developer: ${session.email}`, {
        user_id: session.userId,
        email: session.email,
      });
      consumerId = result.consumerId;
      keyId = result.keyId;
      apiKey = result.apiKey;
    }

    const keyHint = maskKey(apiKey);

    // Store reference in Supabase
    const { error: insertError } = await supabase.from('api_keys').insert({
      user_id: session.userId,
      zuplo_consumer_id: consumerId,
      zuplo_key_id: keyId,
      key_hint: keyHint,
      label: keyLabel,
    });

    if (insertError) {
      console.error('[createApiKey] Supabase insert error:', insertError.message);
      return { success: false, error: insertError.message };
    }

    return { success: true, apiKey, keyHint };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating API key.';
    console.error('[createApiKey] Error:', message);
    return { success: false, error: message };
  }
}

export async function listApiKeys(): Promise<{
  keys: ApiKeyRecord[];
  error?: string;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return { keys: [], error: 'Service not configured.' };
    }

    const supabase = await createSupabaseServerActionClient();
    const session = await ensureAuthenticated(supabase);

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, key_hint, is_active, created_at, revoked_at')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { keys: [], error: error.message };
    }

    return { keys: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load API keys.';
    console.error('[listApiKeys] Error:', message);
    return { keys: [], error: message };
  }
}

export async function revokeApiKey(keyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Service not configured.' };
    }

    const supabase = await createSupabaseServerActionClient();
    const session = await ensureAuthenticated(supabase);

    // Fetch the key record (ownership enforced by RLS)
    const { data: keyRecord, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, zuplo_consumer_id, zuplo_key_id, user_id')
      .eq('id', keyId)
      .eq('user_id', session.userId)
      .single();

    if (fetchError || !keyRecord) {
      return { success: false, error: 'API key not found.' };
    }

    try {
      const name = consumerName(session.userId);
      await deleteZuploApiKey(name, keyRecord.zuplo_key_id);
    } catch {
      // If Zuplo deletion fails, still mark as revoked locally
    }

    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke API key.';
    console.error('[revokeApiKey] Error:', message);
    return { success: false, error: message };
  }
}

export async function updateProfile(data: {
  displayName?: string;
  company?: string;
  website?: string;
  bio?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service not configured.' };
  }

  const supabase = await createSupabaseServerActionClient();
  const session = await ensureAuthenticated(supabase);

  const updates: Record<string, string | null> = {};
  if (data.displayName !== undefined) updates.display_name = data.displayName.trim() || null;
  if (data.company !== undefined) updates.company = data.company.trim() || null;
  if (data.website !== undefined) updates.website = data.website.trim() || null;
  if (data.bio !== undefined) updates.bio = data.bio.trim() || null;

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', session.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
