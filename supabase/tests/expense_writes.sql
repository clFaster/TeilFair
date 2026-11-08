-- Uses the seeded records in scripts/test-database-security.mjs's disposable database.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

INSERT INTO public.members(id, group_id, name) VALUES
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Foreign member'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Replacement member'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Boundary member');

SET LOCAL ROLE anon;
SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
DO $$ DECLARE result jsonb; denied boolean; BEGIN
  BEGIN
    PERFORM public.save_expense(
      '00000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '{"description":"Bad total","total_amount":10,"expense_date":"2026-10-01T18:30:00Z","payers":[{"member_id":"10000000-0000-4000-8000-000000000001","amount":9}],"splits":[{"member_id":"10000000-0000-4000-8000-000000000001","share":1,"share_type":"ratio"}]}',
      1);
    RAISE EXCEPTION 'Invalid payer totals were accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;

  BEGIN
    PERFORM public.save_expense(
      '00000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000004',
      '{"description":"Overallocated","total_amount":10,"expense_date":"2026-10-01T18:30:00Z","payers":[{"member_id":"10000000-0000-4000-8000-000000000001","amount":10}],"splits":[{"member_id":"10000000-0000-4000-8000-000000000001","share":9,"share_type":"fixed"},{"member_id":"10000000-0000-4000-8000-000000000003","share":10.2,"share_type":"percentage"}]}',
      0);
    RAISE EXCEPTION 'Split coverage over by more than one cent was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;

  result := public.save_expense(
    '00000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004',
    '{"description":"Coverage tolerance","total_amount":10,"expense_date":"2026-10-01T18:30:00Z","payers":[{"member_id":"10000000-0000-4000-8000-000000000001","amount":10}],"splits":[{"member_id":"10000000-0000-4000-8000-000000000001","share":9,"share_type":"fixed"},{"member_id":"10000000-0000-4000-8000-000000000003","share":10.1,"share_type":"percentage"}]}',
    0);
  ASSERT result #>> '{expense,revision}' = '1', 'A one-cent allocation tolerance must be accepted';

  BEGIN
    PERFORM public.save_expense(
      '00000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '{"description":"Foreign split","total_amount":10,"expense_date":"2026-10-01T18:30:00Z","payers":[{"member_id":"10000000-0000-4000-8000-000000000001","amount":10}],"splits":[{"member_id":"10000000-0000-4000-8000-000000000002","share":1,"share_type":"ratio"}]}',
      1);
    RAISE EXCEPTION 'A failed replacement was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  result := public.save_expense(
    '00000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '{"description":"Replacement","total_amount":10,"expense_date":"2026-10-02T18:30:00Z","payers":[{"member_id":"10000000-0000-4000-8000-000000000003","amount":10}],"splits":[{"member_id":"10000000-0000-4000-8000-000000000003","share":1,"share_type":"ratio"}]}',
    1);
  ASSERT result #>> '{expense,revision}' = '2', 'Successful update must advance the revision';

  BEGIN
    PERFORM public.save_expense(
      '00000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '{"description":"Stale replacement","total_amount":10,"expense_date":"2026-10-02T18:30:00Z","payers":[{"member_id":"10000000-0000-4000-8000-000000000003","amount":10}],"splits":[{"member_id":"10000000-0000-4000-8000-000000000003","share":1,"share_type":"ratio"}]}',
      1);
    RAISE EXCEPTION 'A stale revision was accepted';
  EXCEPTION WHEN SQLSTATE '40001' THEN NULL;
  END;

  BEGIN
    INSERT INTO public.expense_payers(expense_id, member_id, amount)
    VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 1);
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly insert payer rows';

  BEGIN
    UPDATE public.expense_payers SET amount = 2
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly update payer rows';

  BEGIN
    DELETE FROM public.expense_payers
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly delete payer rows';

  BEGIN
    INSERT INTO public.expense_splits(expense_id, member_id, share, share_type)
    VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 'ratio');
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly insert split rows';

  BEGIN
    UPDATE public.expense_splits SET share = 2
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly update split rows';

  BEGIN
    DELETE FROM public.expense_splits
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly delete split rows';

  BEGIN
    INSERT INTO public.expenses(id, group_id, description, total_amount, expense_date)
    VALUES ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001',
      'Direct insert', 10, '2026-10-01T18:30:00Z');
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly insert expenses';

  BEGIN
    UPDATE public.expenses SET description = 'Direct update'
    WHERE id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'anon must not directly update expenses';
END $$;

RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT description = 'Replacement' AND total_amount = 10 AND revision = 2
    FROM public.expenses WHERE id = '20000000-0000-4000-8000-000000000001'),
    'Failed or stale replacement changed the expense';
  ASSERT (SELECT member_id = '10000000-0000-4000-8000-000000000003' AND amount = 10
    FROM public.expense_payers WHERE expense_id = '20000000-0000-4000-8000-000000000001'),
    'Failed or stale replacement changed payer rows';
  ASSERT (SELECT member_id = '10000000-0000-4000-8000-000000000003' AND share = 1
    FROM public.expense_splits WHERE expense_id = '20000000-0000-4000-8000-000000000001'),
    'Failed or stale replacement changed split rows';
END $$;

SET LOCAL ROLE authenticated;
DO $$ DECLARE denied boolean; BEGIN
  BEGIN
    INSERT INTO public.expense_payers(expense_id, member_id, amount)
    VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1);
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly insert payer rows';
  BEGIN
    UPDATE public.expense_payers SET amount = 2
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly update payer rows';
  BEGIN
    DELETE FROM public.expense_payers
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly delete payer rows';
  BEGIN
    INSERT INTO public.expense_splits(expense_id, member_id, share, share_type)
    VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 'ratio');
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly insert split rows';
  BEGIN
    UPDATE public.expense_splits SET share = 2
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly update split rows';
  BEGIN
    DELETE FROM public.expense_splits
    WHERE expense_id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly delete split rows';
  BEGIN
    INSERT INTO public.expenses(id, group_id, description, total_amount, expense_date)
    VALUES ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001',
      'Direct insert', 10, '2026-10-01T18:30:00Z');
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly insert expenses';
  BEGIN
    UPDATE public.expenses SET description = 'Direct update'
    WHERE id = '20000000-0000-4000-8000-000000000001';
    denied := false;
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'authenticated must not directly update expenses';
END $$;
RESET ROLE;
ROLLBACK;