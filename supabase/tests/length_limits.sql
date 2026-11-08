BEGIN;
SET LOCAL plpgsql.check_asserts = on;

DO $$
DECLARE
  test_group_id uuid;
  rejected boolean;
BEGIN
  INSERT INTO public.groups(name, read_token, write_token)
    VALUES (repeat('g', 100), repeat('r', 128), repeat('w', 128))
    RETURNING id INTO test_group_id;
  INSERT INTO public.members(group_id, name) VALUES (test_group_id, repeat('m', 100));
  INSERT INTO public.expenses(group_id, description, total_amount)
    VALUES (test_group_id, repeat('d', 250), 1);
  ASSERT (SELECT char_length(name) = 100 FROM public.groups WHERE id = test_group_id);
  ASSERT (SELECT char_length(name) = 100 FROM public.members WHERE group_id = test_group_id);
  ASSERT (SELECT char_length(description) = 250 FROM public.expenses WHERE group_id = test_group_id);

  BEGIN
    INSERT INTO public.groups(name, read_token, write_token)
      VALUES (repeat('g', 101), repeat('a', 32), repeat('b', 32));
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Group names longer than 100 characters must be rejected';

  BEGIN
    INSERT INTO public.groups(name, read_token, write_token)
      VALUES ('Token too long', repeat('a', 129), repeat('b', 32));
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Tokens longer than 128 characters must be rejected';

  BEGIN
    INSERT INTO public.members(group_id, name) VALUES (test_group_id, repeat('m', 101));
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Member names longer than 100 characters must be rejected';

  BEGIN
    INSERT INTO public.members(group_id, name) VALUES (test_group_id, '   ');
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Empty member names must be rejected';

  BEGIN
    INSERT INTO public.expenses(group_id, description, total_amount)
      VALUES (test_group_id, repeat('d', 251), 1);
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Expense descriptions longer than 250 characters must be rejected';

  BEGIN
    INSERT INTO public.expenses(group_id, description, total_amount) VALUES (test_group_id, '   ', 1);
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Empty expense descriptions must be rejected';
END $$;

-- Padding must count toward the stored size, and whitespace-only values fail.
DO $$ DECLARE invalid_text text; invalid_currency text; BEGIN
  FOREACH invalid_text IN ARRAY ARRAY[repeat(' ',100)||'x', 'x'||repeat(' ',100), E'\t\n'] LOOP
    BEGIN
      INSERT INTO public.groups(name,read_token,write_token)
      VALUES(invalid_text,repeat('a',32),repeat('b',32));
      RAISE EXCEPTION 'Invalid group name was accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
      INSERT INTO public.members(group_id,name)
      VALUES('00000000-0000-4000-8000-000000000001',invalid_text);
      RAISE EXCEPTION 'Invalid member name was accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  FOREACH invalid_currency IN ARRAY ARRAY['EU','EURO','eur','EU1',repeat('X',10000)] LOOP
    BEGIN
      INSERT INTO public.groups(name,currency,read_token,write_token)
      VALUES('Currency test',invalid_currency,repeat('a',32),repeat('b',32));
      RAISE EXCEPTION 'Invalid currency was accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  FOREACH invalid_text IN ARRAY ARRAY[repeat(' ',250)||'x', 'x'||repeat(' ',250), E'\t\n'] LOOP
    BEGIN
      INSERT INTO public.expenses(group_id,description,total_amount)
      VALUES('00000000-0000-4000-8000-000000000001',invalid_text,1);
      RAISE EXCEPTION 'Invalid stored description was accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
END $$;

SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
DO $$ DECLARE api_role text; invalid_text text; result jsonb; BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I',api_role);
    FOREACH invalid_text IN ARRAY ARRAY[repeat('d',251),repeat(' ',250)||'x','x'||repeat(' ',250),E'\t\n'] LOOP
      BEGIN
        PERFORM public.save_expense(
          '00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
          jsonb_build_object('description',invalid_text,'total_amount',10,'expense_date','2026-11-08T00:00:00Z',
            'payers',jsonb_build_array(jsonb_build_object('member_id','10000000-0000-4000-8000-000000000001','amount',10)),
            'splits',jsonb_build_array(jsonb_build_object('member_id','10000000-0000-4000-8000-000000000001','share',1,'share_type','ratio'))),1);
        RAISE EXCEPTION 'Invalid RPC description was accepted';
      EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
    END LOOP;
    RESET ROLE;
  END LOOP;
  result := public.save_expense(
    '00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
    jsonb_build_object('description',repeat('d',250),'total_amount',10,'expense_date','2026-11-08T00:00:00Z',
      'payers',jsonb_build_array(jsonb_build_object('member_id','10000000-0000-4000-8000-000000000001','amount',10)),
      'splits',jsonb_build_array(jsonb_build_object('member_id','10000000-0000-4000-8000-000000000001','share',1,'share_type','ratio'))),1);
  ASSERT char_length(result #>> '{expense,description}') = 250, 'The 250-character boundary must work';
END $$;

ROLLBACK;
