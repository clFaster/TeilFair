-- Uses the seeded records in scripts/test-database-security.mjs's disposable database.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

DO $$ BEGIN
    ASSERT (SELECT count(*) = 1 FROM public.expense_payers
        WHERE expense_id = '20000000-0000-4000-8000-000000000001');
    ASSERT (SELECT count(*) = 1 FROM public.expense_splits
        WHERE expense_id = '20000000-0000-4000-8000-000000000001');
END $$;

-- Exercise deletion with the same permissions as a capability-based API client.
SET LOCAL ROLE anon;
SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
DO $$ DECLARE n integer; BEGIN
    DELETE FROM public.expenses WHERE id = '20000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1, 'Writer must delete the seeded expense';
END $$;

-- Child SELECT policies hide orphans after their parent disappears. Inspect as
-- the original postgres connection so an empty result proves physical deletion.
RESET ROLE;
DO $$ BEGIN
    ASSERT NOT row_security_active('public.expenses'::regclass);
    ASSERT NOT row_security_active('public.expense_payers'::regclass);
    ASSERT NOT row_security_active('public.expense_splits'::regclass);
    ASSERT NOT EXISTS (SELECT 1 FROM public.expenses
        WHERE id = '20000000-0000-4000-8000-000000000001'), 'Expense deletion did not persist';
    ASSERT NOT EXISTS (SELECT 1 FROM public.expense_payers
        WHERE expense_id = '20000000-0000-4000-8000-000000000001'), 'Expense deletion left payer rows behind';
    ASSERT NOT EXISTS (SELECT 1 FROM public.expense_splits
        WHERE expense_id = '20000000-0000-4000-8000-000000000001'), 'Expense deletion left split rows behind';
END $$;
ROLLBACK;
