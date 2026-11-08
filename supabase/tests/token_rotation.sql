BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $$ DECLARE api_role text; test_group uuid; returned_write text; BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    test_group:=gen_random_uuid();
    INSERT INTO public.groups(id,name,read_token,write_token)
      VALUES(test_group,'Rotation test',repeat('a',32),repeat('b',32));
    EXECUTE format('SET LOCAL ROLE %I',api_role);
    PERFORM set_config('request.headers','{}',true);
    BEGIN
      PERFORM public.rotate_group_tokens(test_group,repeat('c',32),repeat('d',32));
      RAISE EXCEPTION 'Caller without a token could rotate links';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('a',32))::text,true);
    BEGIN
      PERFORM public.rotate_group_tokens(test_group,repeat('c',32),repeat('d',32));
      RAISE EXCEPTION 'Reader could rotate links';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('b',32))::text,true);
    BEGIN
      PERFORM public.rotate_group_tokens(test_group,repeat('a',32),repeat('d',32));
      RAISE EXCEPTION 'Rotation accepted a reused token';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
    BEGIN
      PERFORM public.rotate_group_tokens(test_group,repeat('c',32),repeat('c',32));
      RAISE EXCEPTION 'Rotation accepted identical tokens';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
    PERFORM public.rotate_group_tokens(test_group,repeat('c',32),repeat('d',32));
    ASSERT (SELECT count(*)=0 FROM public.get_group(test_group)), 'Old writer still has access';
    PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('a',32))::text,true);
    ASSERT (SELECT count(*)=0 FROM public.get_group(test_group)), 'Old reader still has access';
    PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('c',32))::text,true);
    SELECT write_token INTO returned_write FROM public.get_group(test_group);
    ASSERT returned_write='', 'New reader received edit authority';
    BEGIN
      UPDATE public.groups SET name='Reader write' WHERE id=test_group;
      ASSERT NOT FOUND, 'New reader can write';
    END;
    PERFORM set_config('request.headers',json_build_object('x-group-token',repeat('d',32))::text,true);
    UPDATE public.groups SET name='Rotated writer' WHERE id=test_group;
    ASSERT FOUND, 'New writer cannot write';
    RESET ROLE;
  END LOOP;
END $$;
ROLLBACK;
