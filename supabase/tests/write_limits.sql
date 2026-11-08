BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $$ DECLARE target_table text; actual bigint; api_role text; BEGIN
  ASSERT (SELECT value=10 FROM private.write_limits WHERE name='creations_per_minute');
  ASSERT (SELECT value=100 FROM private.write_limits WHERE name='creations_per_hour');
  ASSERT (SELECT value=600 FROM private.write_limits WHERE name='group_writes_per_minute');
  FOREACH target_table IN ARRAY ARRAY['groups','members','expenses','expense_payers','expense_splits'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',target_table) INTO actual;
    ASSERT (SELECT total=actual FROM private.write_totals t WHERE t.table_name=target_table), 'Initial row counter is incorrect';
  END LOOP;
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    ASSERT NOT has_table_privilege(api_role,'private.write_limits','UPDATE');
    ASSERT NOT has_table_privilege(api_role,'private.write_budgets','SELECT');
    ASSERT NOT has_table_privilege(api_role,'private.write_totals','UPDATE');
    ASSERT NOT has_function_privilege(api_role,'private.consume_write_budget(text,bigint,integer)','EXECUTE');
    ASSERT NOT has_function_privilege(api_role,'private.enforce_write_limits()','EXECUTE');
  END LOOP;
END $$;

-- Creation limits apply to both API roles, even when bypassing the website.
UPDATE private.write_limits SET value=1 WHERE name='creations_per_minute';
DO $$ DECLARE api_role text; test_group uuid; BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    DELETE FROM private.write_budgets WHERE scope='creations';
    test_group:=gen_random_uuid();
    EXECUTE format('SET LOCAL ROLE %I',api_role);
    PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('b',32))::text,true);
    INSERT INTO public.groups(id,name,read_token,write_token)
      VALUES(test_group,'Creation budget',repeat('a',32),repeat('b',32));
    BEGIN
      INSERT INTO public.groups(name,read_token,write_token)
        VALUES('Excess creation',repeat('a',32),repeat('b',32));
      RAISE EXCEPTION 'Creation budget was bypassed' USING ERRCODE='XX000';
    EXCEPTION WHEN raise_exception THEN NULL; END;
    RESET ROLE;
    DELETE FROM public.groups WHERE id=test_group;
  END LOOP;
END $$;
ROLLBACK;

BEGIN;
SET LOCAL plpgsql.check_asserts=on;
-- Per-group budgets, member caps, and global caps retain exact counters on
-- rejected writes, ON CONFLICT DO NOTHING, and deletion.
DO $$ DECLARE test_group uuid:=gen_random_uuid(); test_member uuid:=gen_random_uuid();
  baseline bigint; current_total bigint; BEGIN
  INSERT INTO public.groups(id,name,read_token,write_token)
    VALUES(test_group,'Write budget',repeat('a',32),repeat('b',32));
  SELECT total INTO baseline FROM private.write_totals WHERE table_name='members';
  UPDATE private.write_limits SET value=1 WHERE name IN ('group_writes_per_minute','members_per_group');
  PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('b',32))::text,true);
  SET LOCAL ROLE anon;
  INSERT INTO public.members(id,group_id,name) VALUES(test_member,test_group,'First member');
  BEGIN
    INSERT INTO public.members(group_id,name) VALUES(test_group,'Budget bypass');
    RAISE EXCEPTION 'Group write budget was bypassed' USING ERRCODE='XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  RESET ROLE;
  DELETE FROM private.write_budgets WHERE scope='group:'||test_group::text;
  UPDATE private.write_limits SET value=600 WHERE name='group_writes_per_minute';
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.members(group_id,name) VALUES(test_group,'Capacity bypass');
    RAISE EXCEPTION 'Per-group capacity was bypassed' USING ERRCODE='XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  RESET ROLE;
  UPDATE private.write_limits SET value=100 WHERE name='members_per_group';
  UPDATE private.write_limits SET value=baseline+1 WHERE name='members_rows';
  SET LOCAL ROLE anon;
  BEGIN
    INSERT INTO public.members(group_id,name) VALUES(test_group,'Global capacity bypass');
    RAISE EXCEPTION 'Global capacity was bypassed' USING ERRCODE='XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  RESET ROLE;
  INSERT INTO public.members(id,group_id,name) VALUES(test_member,test_group,'Conflict') ON CONFLICT DO NOTHING;
  SELECT total INTO current_total FROM private.write_totals WHERE table_name='members';
  ASSERT current_total=baseline+1, 'Rejected/conflicting writes consumed row capacity';
  DELETE FROM public.members WHERE id=test_member;
  ASSERT (SELECT total=baseline FROM private.write_totals WHERE table_name='members'), 'Deletion did not release capacity';
  INSERT INTO public.members(group_id,name) VALUES(test_group,'Released capacity');
  ASSERT (SELECT total=baseline+1 FROM private.write_totals WHERE table_name='members'), 'Released capacity cannot be reused';
END $$;
ROLLBACK;
