# Security Audit: API Key Creation Authorization

**Date:** 2026-02-09
**Branch:** `main` (commit `0f257aa`)
**Auditor:** Claude (pen test of API key gating logic)

---

## System Overview

Users sign up via magic link → get a `profiles` row with `api_access_approved = false` → admins toggle approval via admin panel → approved users can create API keys at `/developer/keys` which provisions keys in Zuplo API Gateway.

### Key files

| File | Purpose |
|------|---------|
| `src/app/developer/actions.ts` | Server actions: `createApiKey()`, `listApiKeys()`, `revokeApiKey()`, `updateProfile()` |
| `src/lib/session.ts` | `getCurrentSession()` reads `profiles.api_access_approved` from DB; `ensureAuthenticated()` guard |
| `src/lib/zuploAdmin.ts` | Server-only Zuplo Dev API client (creates/deletes consumers and keys) |
| `src/app/admin/actions.ts` | Admin server actions: `toggleApiAccess()`, `assignRole()`, `removeRole()`, `fetchUsers()` |
| `src/middleware.ts` | Route protection: `/developer/*` requires login, `/admin/*` requires login |
| `src/app/developer/keys/page.tsx` | Client-side UI gate (shows "pending" if not approved) |
| `src/lib/supabaseServerClient.ts` | Supabase client factories (server component, server action, route handler, middleware) |

---

## What's Secure (No Action Needed)

1. **Server-side `apiAccessApproved` check** — `createApiKey()` at `developer/actions.ts:48` checks `session.apiAccessApproved` server-side before calling Zuplo. Manipulating the client UI alone cannot bypass this.

2. **Session derived from fresh DB read** — `getCurrentSession()` in `session.ts:65-67` reads `api_access_approved` directly from the `profiles` table on every call. No stale JWT claims.

3. **Key ownership enforced** — `revokeApiKey()` filters by `.eq('user_id', session.userId)`. No IDOR on revocation.

4. **Key limit enforced** — Max 5 active keys per user (`developer/actions.ts:53-64`).

5. **Zuplo secrets server-only** — `ZUPLO_DEV_API_KEY`, `ZUPLO_ACCOUNT_NAME`, `ZUPLO_BUCKET_NAME` are not `NEXT_PUBLIC_*` prefixed.

6. **`updateProfile()` whitelist** — Only allows `display_name`, `company`, `website`, `bio`. Does NOT allow `api_access_approved` (`developer/actions.ts:207-211`).

7. **Admin role checks** — `toggleApiAccess()` requires `admin`/`support` role. `assignRole()`/`removeRole()` require `admin` only.

---

## CRITICAL Vulnerabilities Found

### Vuln 1: Users can likely self-approve via direct Supabase client

**Severity: CRITICAL**

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are exposed to the browser (by design — this is how Supabase SSR works). Any authenticated user can open DevTools and run:

```js
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const supabase = createClient('SUPABASE_URL', 'ANON_KEY');
// User already has auth cookies
await supabase.from('profiles').update({ api_access_approved: true }).eq('id', 'MY_USER_ID');
```

If the RLS policy on `profiles` allows unrestricted UPDATE on own rows (as written in `docs/USER_AUTH_IMPLEMENTATION_PLAN.md`), this bypasses the entire approval gate. After this, calling `createApiKey()` succeeds.

**Status:** Needs verification in Supabase Dashboard → Database → Policies. If the UPDATE policy on `profiles` does not restrict which columns can be changed, this is exploitable.

### Vuln 2: Users may be able to self-assign admin roles

**Severity: CRITICAL**

Same vector — if `user_roles` table allows INSERT by authenticated users:

```js
await supabase.from('user_roles').insert({ user_id: 'MY_ID', role: 'admin', is_active: true });
```

This would grant full admin access (church management, user management, everything).

**Status:** Needs verification. If `user_roles` has no RLS or has permissive INSERT policies, this is exploitable.

### Vuln 3: Revoked keys may remain active in Zuplo

**Severity: MEDIUM**

At `developer/actions.ts:170-175`, if Zuplo key deletion fails, the error is silently caught and the key is still marked revoked locally. The key continues to work at the API gateway.

### Vuln 4: Middleware skips `/api/` routes

**Severity: LOW**

`middleware.ts:29` skips all `/api/` routes. Current API routes (`/api/feedback`, `/api/request-access`, `/api/ask`) are intentionally public, but any future protected API routes will need their own auth checks.

---

## Fixes To Implement

### Fix 1: Protect `profiles.api_access_approved` from self-update

**Option A — Database trigger (recommended, most robust):**

```sql
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role can change approval status
  IF NEW.api_access_approved IS DISTINCT FROM OLD.api_access_approved THEN
    NEW.api_access_approved := OLD.api_access_approved;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_approval ON public.profiles;
CREATE TRIGGER protect_profile_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role')
  EXECUTE FUNCTION public.protect_profile_fields();
```

**Option B — RLS policy (alternative):**

```sql
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (safe columns only)"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND api_access_approved IS NOT DISTINCT FROM (
      SELECT p.api_access_approved FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
```

### Fix 2: Lock down `user_roles` table

```sql
-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only READ their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Only service_role (used by admin server actions) can modify roles
DROP POLICY IF EXISTS "Users can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete roles" ON public.user_roles;
```

### Fix 3: Lock down `api_keys` table

```sql
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own keys" ON public.api_keys;
CREATE POLICY "Users can read own keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own keys" ON public.api_keys;
CREATE POLICY "Users can insert own keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can soft-revoke own keys" ON public.api_keys;
CREATE POLICY "Users can soft-revoke own keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

### Fix 4: Switch admin actions to service_role client

**Why:** Fixes 1-2 will block the admin panel's `toggleApiAccess()`, `assignRole()`, and `removeRole()` because those currently use the user's anon-key Supabase client. They need to use the service_role client instead.

**File to modify:** `src/app/admin/actions.ts`

**Changes needed:**

In `toggleApiAccess()` (line 508-529): after verifying admin role, use `createSupabaseAdminClient()` instead of `createSupabaseServerActionClient()` for the `.update()` call.

In `assignRole()` (line 455-482): same — use admin client for the `.upsert()` call.

In `removeRole()` (line 484-506): same — use admin client for the `.update()` call.

In `fetchUsers()` (line 380-453): this reads `profiles` and `user_roles` tables. If RLS only grants SELECT on own rows, admins won't be able to list all users. This needs the admin client too (or a `SECURITY DEFINER` RPC).

**Pattern:**
```typescript
// BEFORE (uses user's anon client — blocked by new RLS):
const supabase = await createSupabaseServerActionClient();
const { error } = await supabase.from('profiles').update({ api_access_approved: approved }).eq('id', userId);

// AFTER (uses service_role — bypasses RLS):
const { client: adminClient, error: clientError } = createSupabaseAdminClient();
if (!adminClient || clientError) return { success: false, error: clientError ?? 'Admin client failed.' };
const { error } = await adminClient.from('profiles').update({ api_access_approved: approved }).eq('id', userId);
```

The `createSupabaseAdminClient()` function already exists in `admin/actions.ts:70-81` and uses `SUPABASE_SERVICE_ROLE_KEY`. It just needs to be reused for the user management actions.

---

## Implementation Order

1. **First: verify current RLS** — Check Supabase Dashboard → Database → Policies for `profiles`, `user_roles`, `api_keys` tables. This determines actual severity.
2. **Fix 4 (code change)** — Switch admin actions to service_role client. This is a prerequisite so that the RLS lockdowns (Fixes 1-3) don't break the admin panel.
3. **Fixes 1-3 (SQL migrations)** — Run via Supabase CLI (`supabase migration new <name>`) or directly in Supabase SQL Editor. Apply Fix 1 (trigger approach recommended), then Fix 2, then Fix 3.
4. **Verify** — Test from browser DevTools on a non-admin account that `profiles.api_access_approved` cannot be self-set, `user_roles` cannot be self-inserted, and `createApiKey()` still correctly blocks unapproved users.

## Prerequisites

- **Supabase CLI** was not installed (Xcode version conflict with Homebrew). Install options:
  - `npx supabase` (no install needed, runs via npx)
  - Direct binary: `curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz | tar xz && sudo mv supabase /usr/local/bin/`
  - Or just run the SQL directly in the Supabase Dashboard SQL Editor
- The project already has `supabase/config.toml` — the CLI project structure exists, just needs `supabase link` to connect to the remote project.
