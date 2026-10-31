-- Apply after 005. Keep private OUT of Supabase's exposed API schemas.
-- RLS callers still need EXECUTE, but this helper is not a client RPC.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE CREATE ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.check_group_access(group_id UUID, require_write BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = group_id
          AND (public.get_token() = g.write_token
               OR (NOT require_write AND public.get_token() = g.read_token))
    );
$$;

REVOKE ALL ON FUNCTION private.check_group_access(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.check_group_access(UUID, BOOLEAN) TO anon, authenticated;

-- Update only the application's known policies. This also supports reapplying
-- 006 after the policy-recovery migration 004 has been run again.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['members', 'expenses'] LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I USING (private.check_group_access(group_id, FALSE))',
            'Read ' || table_name || ' with valid group token', table_name);
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (private.check_group_access(group_id, TRUE))',
            'Insert ' || table_name || ' with write token', table_name);
        EXECUTE format('ALTER POLICY %I ON public.%I USING (private.check_group_access(group_id, TRUE))',
            'Update ' || table_name || ' with write token', table_name);
        EXECUTE format('ALTER POLICY %I ON public.%I USING (private.check_group_access(group_id, TRUE))',
            'Delete ' || table_name || ' with write token', table_name);
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY['expense_payers', 'expense_splits'] LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I USING (EXISTS (
            SELECT 1 FROM public.expenses e WHERE e.id = expense_id
            AND private.check_group_access(e.group_id, FALSE)))',
            'Read ' || table_name || ' with valid group token', table_name);
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (EXISTS (
            SELECT 1 FROM public.expenses e WHERE e.id = expense_id
            AND private.check_group_access(e.group_id, TRUE)))',
            'Insert ' || table_name || ' with write token', table_name);
        EXECUTE format('ALTER POLICY %I ON public.%I USING (EXISTS (
            SELECT 1 FROM public.expenses e WHERE e.id = expense_id
            AND private.check_group_access(e.group_id, TRUE)))',
            'Update ' || table_name || ' with write token', table_name);
        EXECUTE format('ALTER POLICY %I ON public.%I USING (EXISTS (
            SELECT 1 FROM public.expenses e WHERE e.id = expense_id
            AND private.check_group_access(e.group_id, TRUE)))',
            'Delete ' || table_name || ' with write token', table_name);
    END LOOP;
END $$;

-- RESTRICT deliberately fails if an unexpected dependency still needs this RPC.
DROP FUNCTION IF EXISTS public.check_group_access(UUID, BOOLEAN) RESTRICT;

-- public.get_group intentionally remains SECURITY DEFINER and callable by anon
-- and authenticated: capability links work without login, and the function
-- must read protected token columns to authorize and redact its result.
NOTIFY pgrst, 'reload schema';
COMMIT;
