BEGIN;
SET plpgsql.check_asserts = on;
INSERT INTO public.members(id,group_id,name) VALUES
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Foreign member');
DO $$ DECLARE api_role text; child_table text; BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', api_role);
    PERFORM set_config('request.headers','{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}',true);
    FOREACH child_table IN ARRAY ARRAY['expense_payers','expense_splits'] LOOP
      BEGIN
        IF child_table = 'expense_payers' THEN
          INSERT INTO public.expense_payers(expense_id,member_id,amount) VALUES
          ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',10);
        ELSE
          INSERT INTO public.expense_splits(expense_id,member_id,share,share_type) VALUES
          ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',1,'ratio');
        END IF;
        RAISE EXCEPTION 'Foreign member insert unexpectedly succeeded';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
      BEGIN
        EXECUTE format('UPDATE public.%I SET member_id = %L', child_table,
          '10000000-0000-4000-8000-000000000002');
        RAISE EXCEPTION 'Foreign member update unexpectedly succeeded';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
    END LOOP;
    UPDATE public.expense_payers SET amount = 10;
    UPDATE public.expense_splits SET share = 1;
    ASSERT (SELECT count(*)=1 FROM public.expense_payers);
    ASSERT (SELECT count(*)=1 FROM public.expense_splits);
    EXECUTE 'RESET ROLE';
  END LOOP;
  -- Privileged and concurrent callers cannot move a parent out from under a child.
  BEGIN
    UPDATE public.members SET group_id='00000000-0000-4000-8000-000000000002'
      WHERE id='10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Member reassignment unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.expenses SET group_id='00000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'Expense reassignment unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
