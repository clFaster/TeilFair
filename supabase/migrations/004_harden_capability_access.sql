-- Apply to an existing database after 001-003. No rows or tokens are changed.
-- Deploy the updated web/mobile clients together with this migration: clients
-- must use get_group rather than SELECT * on groups.
BEGIN;

-- Also repairs installations on which the retired reset script was run.
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_token()
RETURNS TEXT LANGUAGE sql STABLE
SET search_path = ''
AS $$
    SELECT NULLIF(NULLIF(current_setting('request.headers', true), '')::json->>'x-group-token', '');
$$;

CREATE OR REPLACE FUNCTION public.check_group_access(group_id UUID, require_write BOOLEAN DEFAULT FALSE)
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

-- Reinstall the known policies, including for interrupted legacy resets.
DROP POLICY IF EXISTS "Anyone can create groups" ON public.groups;
DROP POLICY IF EXISTS "Read groups with valid token" ON public.groups;
DROP POLICY IF EXISTS "Update groups with write token" ON public.groups;
DROP POLICY IF EXISTS "Delete groups with write token" ON public.groups;
DROP POLICY IF EXISTS "Read members with valid group token" ON public.members;
DROP POLICY IF EXISTS "Insert members with write token" ON public.members;
DROP POLICY IF EXISTS "Update members with write token" ON public.members;
DROP POLICY IF EXISTS "Delete members with write token" ON public.members;
DROP POLICY IF EXISTS "Read expenses with valid group token" ON public.expenses;
DROP POLICY IF EXISTS "Insert expenses with write token" ON public.expenses;
DROP POLICY IF EXISTS "Update expenses with write token" ON public.expenses;
DROP POLICY IF EXISTS "Delete expenses with write token" ON public.expenses;
DROP POLICY IF EXISTS "Read expense_payers with valid group token" ON public.expense_payers;
DROP POLICY IF EXISTS "Insert expense_payers with write token" ON public.expense_payers;
DROP POLICY IF EXISTS "Update expense_payers with write token" ON public.expense_payers;
DROP POLICY IF EXISTS "Delete expense_payers with write token" ON public.expense_payers;
DROP POLICY IF EXISTS "Read expense_splits with valid group token" ON public.expense_splits;
DROP POLICY IF EXISTS "Insert expense_splits with write token" ON public.expense_splits;
DROP POLICY IF EXISTS "Update expense_splits with write token" ON public.expense_splits;
DROP POLICY IF EXISTS "Delete expense_splits with write token" ON public.expense_splits;
DROP POLICY IF EXISTS "Anyone can create groups with valid tokens" ON public.groups;

-- Groups policies
-- Anyone can create a group (no authentication required)
CREATE POLICY "Anyone can create groups" ON public.groups
    FOR INSERT WITH CHECK (
        LENGTH(read_token) >= 32 AND LENGTH(write_token) >= 32
        AND read_token != write_token AND TRIM(read_token) != '' AND TRIM(write_token) != ''
    );

-- Can only read a group with valid token
CREATE POLICY "Read groups with valid token" ON public.groups
    FOR SELECT USING (
        get_token() = read_token OR get_token() = write_token
    );

-- Can only update a group with write token
CREATE POLICY "Update groups with write token" ON public.groups
    FOR UPDATE USING (
        get_token() = write_token
    );

-- Can only delete a group with write token
CREATE POLICY "Delete groups with write token" ON public.groups
    FOR DELETE USING (
        get_token() = write_token
    );

-- Members policies
CREATE POLICY "Read members with valid group token" ON public.members
    FOR SELECT USING (check_group_access(group_id, FALSE));

CREATE POLICY "Insert members with write token" ON public.members
    FOR INSERT WITH CHECK (check_group_access(group_id, TRUE));

CREATE POLICY "Update members with write token" ON public.members
    FOR UPDATE USING (check_group_access(group_id, TRUE));

CREATE POLICY "Delete members with write token" ON public.members
    FOR DELETE USING (check_group_access(group_id, TRUE));

-- Expenses policies
CREATE POLICY "Read expenses with valid group token" ON public.expenses
    FOR SELECT USING (check_group_access(group_id, FALSE));

CREATE POLICY "Insert expenses with write token" ON public.expenses
    FOR INSERT WITH CHECK (check_group_access(group_id, TRUE));

CREATE POLICY "Update expenses with write token" ON public.expenses
    FOR UPDATE USING (check_group_access(group_id, TRUE));

CREATE POLICY "Delete expenses with write token" ON public.expenses
    FOR DELETE USING (check_group_access(group_id, TRUE));

-- Expense payers policies (access via expense's group)
CREATE POLICY "Read expense_payers with valid group token" ON public.expense_payers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, FALSE)
        )
    );

CREATE POLICY "Insert expense_payers with write token" ON public.expense_payers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Update expense_payers with write token" ON public.expense_payers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Delete expense_payers with write token" ON public.expense_payers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

-- Expense splits policies (access via expense's group)
CREATE POLICY "Read expense_splits with valid group token" ON public.expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, FALSE)
        )
    );

CREATE POLICY "Insert expense_splits with write token" ON public.expense_splits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Update expense_splits with write token" ON public.expense_splits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );

CREATE POLICY "Delete expense_splits with write token" ON public.expense_splits
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_id
            AND check_group_access(e.group_id, TRUE)
        )
    );


-- RLS restricts rows, not columns. Remove both table-level and any explicit
-- column-level grants before granting only non-secret metadata.
REVOKE SELECT ON public.groups FROM PUBLIC, anon, authenticated;
REVOKE SELECT (id, name, currency, read_token, write_token, created_at)
    ON public.groups FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, currency, created_at) ON public.groups TO anon, authenticated;

-- Only this function discloses capabilities. A reader receives their read token
-- and an empty write_token; a writer can retrieve both links for sharing.
CREATE OR REPLACE FUNCTION public.get_group(requested_group_id UUID)
RETURNS TABLE (id UUID, name TEXT, currency TEXT, read_token TEXT, write_token TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT g.id, g.name, g.currency, g.read_token,
           CASE WHEN public.get_token() = g.write_token THEN g.write_token ELSE ''::text END,
           g.created_at
    FROM public.groups g
    WHERE g.id = requested_group_id
      AND (public.get_token() = g.read_token OR public.get_token() = g.write_token);
$$;

REVOKE ALL ON FUNCTION public.get_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_group_access(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_token() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_group_access(UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group(UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
