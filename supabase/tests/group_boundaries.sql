BEGIN;
SET plpgsql.check_asserts = on;
INSERT INTO public.members(id,group_id,name) VALUES
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Foreign member');
DO $$ DECLARE api_role text; child_table text; test_expense_id uuid; payload jsonb; BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', api_role);
    PERFORM set_config('request.headers','{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}',true);
    test_expense_id := CASE api_role
      WHEN 'anon' THEN '20000000-0000-4000-8000-000000000002'::uuid
      ELSE '20000000-0000-4000-8000-000000000003'::uuid
    END;
    FOREACH child_table IN ARRAY ARRAY['expense_payers','expense_splits'] LOOP
      payload := jsonb_build_object(
        'description', 'Foreign participant test',
        'total_amount', 10,
        'expense_date', '2026-10-01T18:30:00Z',
        'payers', CASE child_table
          WHEN 'expense_payers' THEN jsonb_build_array(jsonb_build_object(
            'member_id', '10000000-0000-4000-8000-000000000002', 'amount', 10))
          ELSE jsonb_build_array(jsonb_build_object(
            'member_id', '10000000-0000-4000-8000-000000000001', 'amount', 10))
        END,
        'splits', CASE child_table
          WHEN 'expense_splits' THEN jsonb_build_array(jsonb_build_object(
            'member_id', '10000000-0000-4000-8000-000000000002', 'share', 1, 'share_type', 'ratio'))
          ELSE jsonb_build_array(jsonb_build_object(
            'member_id', '10000000-0000-4000-8000-000000000001', 'share', 1, 'share_type', 'ratio'))
        END);
      BEGIN
        PERFORM public.save_expense('00000000-0000-4000-8000-000000000001', test_expense_id, payload, 0);
        RAISE EXCEPTION 'Foreign member save unexpectedly succeeded';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
    END LOOP;
    payload := jsonb_build_object(
      'description', 'Same-group participant test',
      'total_amount', 10,
      'expense_date', '2026-10-01T18:30:00Z',
      'payers', jsonb_build_array(jsonb_build_object(
        'member_id', '10000000-0000-4000-8000-000000000001', 'amount', 10)),
      'splits', jsonb_build_array(jsonb_build_object(
        'member_id', '10000000-0000-4000-8000-000000000001', 'share', 1, 'share_type', 'ratio')));
    PERFORM public.save_expense('00000000-0000-4000-8000-000000000001', test_expense_id, payload, 0);
    ASSERT (SELECT count(*)=1 FROM public.expense_payers WHERE expense_payers.expense_id=test_expense_id),
      'Same-group payer save should succeed';
    ASSERT (SELECT count(*)=1 FROM public.expense_splits WHERE expense_splits.expense_id=test_expense_id),
      'Same-group split save should succeed';
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
