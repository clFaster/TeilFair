-- Uses the seeded records in scripts/test-database-security.mjs's disposable database.
-- Deleting a group in a single statement must remove every dependent row.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

INSERT INTO private.write_budgets(scope, period_seconds, starts_at, used)
VALUES ('group:00000000-0000-4000-8000-000000000001', 60, now(), 1)
ON CONFLICT (scope, period_seconds) DO NOTHING;

DO $$ BEGIN
    ASSERT (SELECT count(*) = 1 FROM public.members
        WHERE group_id = '00000000-0000-4000-8000-000000000001');
    ASSERT (SELECT count(*) = 1 FROM public.expenses
        WHERE group_id = '00000000-0000-4000-8000-000000000001');
    ASSERT (SELECT count(*) = 1 FROM public.expense_payers
        WHERE expense_id = '20000000-0000-4000-8000-000000000001');
    ASSERT (SELECT count(*) = 1 FROM public.expense_splits
        WHERE expense_id = '20000000-0000-4000-8000-000000000001');
END $$;

-- A reader must not be able to delete the group.
SET LOCAL ROLE anon;
SET LOCAL request.headers = '{"x-group-token":"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"}';
DO $$ DECLARE n integer; BEGIN
    DELETE FROM public.groups WHERE id = '00000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, 'Reader must not delete the group';
END $$;

-- The writer deletes the group in one statement, exactly like the API client.
SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
DO $$ DECLARE n integer; BEGIN
    DELETE FROM public.groups WHERE id = '00000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, 'Writer must delete the seeded group';
END $$;

-- Child SELECT policies hide orphans after their parent disappears. Inspect as
-- the original postgres connection so an empty result proves physical deletion.
RESET ROLE;
DO $$ BEGIN
    ASSERT NOT EXISTS (SELECT 1 FROM public.groups
        WHERE id = '00000000-0000-4000-8000-000000000001'), 'Group deletion did not persist';
    ASSERT NOT EXISTS (SELECT 1 FROM public.members
        WHERE group_id = '00000000-0000-4000-8000-000000000001'), 'Group deletion left members behind';
    ASSERT NOT EXISTS (SELECT 1 FROM public.expenses
        WHERE group_id = '00000000-0000-4000-8000-000000000001'), 'Group deletion left expenses behind';
    ASSERT NOT EXISTS (SELECT 1 FROM public.expense_payers
        WHERE expense_id = '20000000-0000-4000-8000-000000000001'), 'Group deletion left payer rows behind';
    ASSERT NOT EXISTS (SELECT 1 FROM public.expense_splits
        WHERE expense_id = '20000000-0000-4000-8000-000000000001'), 'Group deletion left split rows behind';
    ASSERT NOT EXISTS (SELECT 1 FROM private.write_budgets
        WHERE scope = 'group:00000000-0000-4000-8000-000000000001'), 'Group deletion left its write budget behind';
    ASSERT EXISTS (SELECT 1 FROM public.groups
        WHERE id = '00000000-0000-4000-8000-000000000002'), 'Group deletion affected another group';
END $$;
ROLLBACK;
