-- Runs against seeded records in the disposable security-test database.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';

DO $$
DECLARE
  api_role text;
  invalid_date text;
  expected_version integer;
  test_expense_id uuid;
  payload jsonb := '{"description":"Date validation","total_amount":10,
    "payers":[{"member_id":"10000000-0000-4000-8000-000000000001","amount":10}],
    "splits":[{"member_id":"10000000-0000-4000-8000-000000000001","share":1,"share_type":"ratio"}]}';
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I',api_role);
    FOREACH invalid_date IN ARRAY ARRAY['infinity','-infinity','not a date','',
      '2026-02-30T00:00:00Z','10000-01-01T00:00:00Z','294276-01-01T00:00:00Z','0001-01-01 BC'] LOOP
      FOR expected_version IN 0..1 LOOP
        test_expense_id := CASE WHEN expected_version=0 THEN '20000000-0000-4000-8000-000000000005'::uuid
          ELSE '20000000-0000-4000-8000-000000000001'::uuid END;
        BEGIN
          PERFORM public.save_expense('00000000-0000-4000-8000-000000000001',test_expense_id,
            payload || jsonb_build_object('expense_date',invalid_date),expected_version);
          RAISE EXCEPTION 'Invalid date accepted for role %, revision %: %',api_role,expected_version,invalid_date;
        EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
      END LOOP;
    END LOOP;
    RESET ROLE;
  END LOOP;
  ASSERT NOT EXISTS (SELECT 1 FROM public.expenses WHERE id='20000000-0000-4000-8000-000000000005'),
    'Invalid creation left a partial expense';
  ASSERT (SELECT revision=1 AND description='Existing expense' FROM public.expenses
    WHERE id='20000000-0000-4000-8000-000000000001'), 'Invalid replacement modified the expense';
  ASSERT (SELECT count(*)=1 AND sum(amount)=10 FROM public.expense_payers
    WHERE expense_id='20000000-0000-4000-8000-000000000001'), 'Invalid replacement modified payers';
  ASSERT (SELECT count(*)=1 AND sum(share)=1 FROM public.expense_splits
    WHERE expense_id='20000000-0000-4000-8000-000000000001'), 'Invalid replacement modified splits';

  -- Constraints also protect privileged writes that bypass the RPC.
  FOREACH invalid_date IN ARRAY ARRAY['infinity','-infinity','10000-01-01T00:00:00Z','0001-01-01 BC'] LOOP
    BEGIN
      INSERT INTO public.expenses(group_id,description,total_amount,expense_date)
      VALUES('00000000-0000-4000-8000-000000000001','Invalid date',10,invalid_date::timestamptz);
      RAISE EXCEPTION 'Invalid direct date was accepted: %',invalid_date;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;

  SET LOCAL ROLE anon;
  PERFORM public.save_expense('00000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000005',payload || '{"expense_date":"0001-01-01T00:00:00Z"}'::jsonb,0);
  PERFORM public.save_expense('00000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000005',payload || '{"expense_date":"9999-12-31T23:59:59Z"}'::jsonb,1);
  RESET ROLE;
  ASSERT (SELECT revision=2 AND expense_date='9999-12-31T23:59:59Z'::timestamptz FROM public.expenses
    WHERE id='20000000-0000-4000-8000-000000000005'), 'Supported date boundaries failed';
END $$;
ROLLBACK;
