-- Runs only in the disposable database created by scripts/test-database-security.mjs.
BEGIN;
SET plpgsql.check_asserts = on;

DO $$ BEGIN
    ASSERT (SELECT count(*) = 5 FROM pg_class WHERE relnamespace = 'public'::regnamespace
        AND relname IN ('groups','members','expenses','expense_payers','expense_splits') AND relrowsecurity);
    ASSERT (SELECT count(*) = 1 FROM public.groups WHERE name = 'Existing group');
    ASSERT (SELECT count(*) = 1 FROM public.members WHERE name = 'Existing member');
END $$;

SET LOCAL ROLE anon;
SET LOCAL request.headers = '{}';
DO $$ BEGIN
    ASSERT (SELECT count(*) = 0 FROM public.groups);
    ASSERT (SELECT count(*) = 0 FROM public.get_group('00000000-0000-4000-8000-000000000001'));
    ASSERT NOT public.check_group_access('00000000-0000-4000-8000-000000000001');
    ASSERT (SELECT count(*) = 0 FROM public.members);
    ASSERT (SELECT count(*) = 0 FROM public.expenses);
    ASSERT (SELECT count(*) = 0 FROM public.expense_payers);
    ASSERT (SELECT count(*) = 0 FROM public.expense_splits);
    ASSERT NOT has_column_privilege(current_user, 'public.groups', 'read_token', 'SELECT');
    ASSERT NOT has_column_privilege(current_user, 'public.groups', 'write_token', 'SELECT');
    BEGIN
        PERFORM write_token FROM public.groups;
        RAISE EXCEPTION 'Direct token access should be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;

SET LOCAL request.headers = '{"x-group-token":"invalid"}';
DO $$ BEGIN
    ASSERT (SELECT count(*) = 0 FROM public.get_group('00000000-0000-4000-8000-000000000001'));
    ASSERT (SELECT count(*) = 0 FROM public.groups);
END $$;

SET LOCAL request.headers = '{"x-group-token":"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"}';
DO $$ DECLARE n integer; BEGIN
    ASSERT (SELECT count(*) = 1 FROM public.groups);
    ASSERT (SELECT write_token = '' AND read_token = repeat('r',32)
        FROM public.get_group('00000000-0000-4000-8000-000000000001'));
    ASSERT (SELECT count(*) = 0 FROM public.get_group('00000000-0000-4000-8000-000000000002'));
    ASSERT public.check_group_access('00000000-0000-4000-8000-000000000001');
    ASSERT NOT public.check_group_access('00000000-0000-4000-8000-000000000001', true);
    ASSERT (SELECT count(*) = 1 FROM public.members);
    ASSERT (SELECT count(*) = 1 FROM public.expenses);
    ASSERT (SELECT count(*) = 1 FROM public.expense_payers);
    ASSERT (SELECT count(*) = 1 FROM public.expense_splits);
    UPDATE public.groups SET name = 'Unauthorized';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0;
    DELETE FROM public.members;
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0;
    BEGIN
        INSERT INTO public.members(group_id,name) VALUES ('00000000-0000-4000-8000-000000000001','Unauthorized');
        RAISE EXCEPTION 'Read token must not insert members';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM write_token FROM public.groups;
        RAISE EXCEPTION 'Readers must not query the write capability directly';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;

SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
DO $$ DECLARE n integer; BEGIN
    ASSERT (SELECT write_token = repeat('w',32) AND read_token = repeat('r',32)
        FROM public.get_group('00000000-0000-4000-8000-000000000001'));
    ASSERT public.check_group_access('00000000-0000-4000-8000-000000000001', true);
    UPDATE public.groups SET name = 'Authorized' WHERE id = '00000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1;
    INSERT INTO public.members(group_id,name) VALUES ('00000000-0000-4000-8000-000000000001','Authorized');
    UPDATE public.expenses SET description = 'Authorized';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1;
    DELETE FROM public.expense_payers;
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1;
    DELETE FROM public.expense_splits;
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 1;
END $$;

-- New group creation must work without a missing-token SELECT bypass.
SET LOCAL request.headers = '{"x-group-token":"nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn"}';
INSERT INTO public.groups(name,read_token,write_token)
    VALUES ('New group',repeat('s',32),repeat('n',32)) RETURNING id,name,currency,created_at;
DO $$ BEGIN
    ASSERT (SELECT count(*) = 1 FROM public.groups WHERE name = 'New group');
END $$;

SET LOCAL ROLE authenticated;
SET LOCAL request.headers = '{"x-group-token":"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"}';
DO $$ BEGIN
    ASSERT NOT has_column_privilege(current_user, 'public.groups', 'write_token', 'SELECT');
    ASSERT (SELECT write_token = '' FROM public.get_group('00000000-0000-4000-8000-000000000001'));
END $$;
ROLLBACK;
