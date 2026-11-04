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
    VALUES (test_group_id, repeat('d', 1000), 1);
  ASSERT (SELECT char_length(name) = 100 FROM public.groups WHERE id = test_group_id);
  ASSERT (SELECT char_length(name) = 100 FROM public.members WHERE group_id = test_group_id);
  ASSERT (SELECT char_length(description) = 1000 FROM public.expenses WHERE group_id = test_group_id);

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
      VALUES (test_group_id, repeat('d', 1001), 1);
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Expense descriptions longer than 1000 characters must be rejected';

  BEGIN
    INSERT INTO public.expenses(group_id, description, total_amount) VALUES (test_group_id, '   ', 1);
    rejected := false;
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  ASSERT rejected, 'Empty expense descriptions must be rejected';
END $$;

ROLLBACK;