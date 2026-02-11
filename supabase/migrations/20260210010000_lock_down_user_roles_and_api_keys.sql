-- Lock down user_roles and api_keys tables with proper RLS policies.
--
-- user_roles: Only service_role (admin server actions) can INSERT/UPDATE/DELETE.
-- Authenticated users can only SELECT their own roles.
--
-- api_keys: Authenticated users can read/insert/update only their own keys.
-- service_role can do anything (for admin panel).

-- ============================================================
-- user_roles
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (prevents accidental bypasses)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing permissive policies that might allow self-escalation
DROP POLICY IF EXISTS "Users can read own roles"   ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert roles"     ON public.user_roles;
DROP POLICY IF EXISTS "Users can update roles"     ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete roles"     ON public.user_roles;

-- Authenticated users can only read their own role rows
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for authenticated — only service_role can modify.
-- service_role bypasses RLS by default, so no explicit policy is needed for it.

-- ============================================================
-- api_keys
-- ============================================================
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies
DROP POLICY IF EXISTS "Users can read own keys"        ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert own keys"      ON public.api_keys;
DROP POLICY IF EXISTS "Users can soft-revoke own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own keys"      ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own keys"      ON public.api_keys;

-- Users can read only their own API keys
CREATE POLICY "Users can read own keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert keys only for themselves
CREATE POLICY "Users can insert own keys"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update (soft-revoke) only their own keys
CREATE POLICY "Users can update own keys"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- No DELETE policy for authenticated users — keys are soft-revoked, not deleted.
-- service_role bypasses RLS and can perform any operation.
