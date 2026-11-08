-- Signup-free writes remain available, with server-enforced budgets. Limits
-- apply to direct REST/RPC callers too. Existing application rows are untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS private.write_limits (
  name text PRIMARY KEY,
  value bigint NOT NULL CHECK (value > 0)
);
INSERT INTO private.write_limits(name,value) VALUES
  ('groups_rows',2000),('members_rows',20000),('expenses_rows',50000),
  ('expense_payers_rows',100000),('expense_splits_rows',250000),
  ('members_per_group',100),('expenses_per_group',1000),
  ('creations_per_minute',10),('creations_per_hour',100),('group_writes_per_minute',600)
ON CONFLICT (name) DO NOTHING;
CREATE TABLE IF NOT EXISTS private.write_totals (
  table_name text PRIMARY KEY,
  total bigint NOT NULL CHECK (total >= 0)
);
CREATE TABLE IF NOT EXISTS private.write_budgets (
  scope text NOT NULL,
  period_seconds integer NOT NULL,
  starts_at timestamptz NOT NULL,
  used bigint NOT NULL,
  PRIMARY KEY (scope,period_seconds)
);
REVOKE ALL ON private.write_limits,private.write_totals,private.write_budgets FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION private.consume_write_budget(budget_scope text, max_requests bigint, seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE start_time timestamptz; consumed bigint;
BEGIN
  start_time := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / seconds) * seconds);
  INSERT INTO private.write_budgets AS b(scope,period_seconds,starts_at,used)
    VALUES (budget_scope,seconds,start_time,1)
    ON CONFLICT (scope,period_seconds) DO UPDATE
    SET starts_at=excluded.starts_at,
        used=CASE WHEN b.starts_at < excluded.starts_at THEN 1 ELSE b.used+1 END
    WHERE b.starts_at < excluded.starts_at OR b.used < max_requests
    RETURNING used INTO consumed;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Too many requests. Please try again later.' USING ERRCODE='P0001';
  END IF;
END $$;
REVOKE ALL ON FUNCTION private.consume_write_budget(text,bigint,integer) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION private.enforce_write_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_group uuid; cap bigint; current_count bigint;
BEGIN
  IF TG_OP='DELETE' THEN
    UPDATE private.write_totals SET total=greatest(0,total-1) WHERE table_name=TG_TABLE_NAME;
    IF TG_TABLE_NAME='groups' THEN
      DELETE FROM private.write_budgets WHERE scope='group:' || OLD.id::text;
    END IF;
    RETURN OLD;
  END IF;

  -- Count only rows that were actually inserted. BEFORE INSERT also fires for
  -- ON CONFLICT DO NOTHING, which must not consume global storage capacity.
  IF TG_WHEN='AFTER' THEN
    SELECT value INTO cap FROM private.write_limits WHERE name=TG_TABLE_NAME || '_rows';
    UPDATE private.write_totals SET total=total+1 WHERE table_name=TG_TABLE_NAME AND total<cap
      RETURNING total INTO current_count;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service capacity reached. Please try again later.' USING ERRCODE='P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME IN ('groups','members') THEN
    IF length(NEW.name)>200 THEN
      RAISE EXCEPTION 'Names must not exceed 200 characters' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='expenses' THEN
    IF length(NEW.description)>2000 THEN
      RAISE EXCEPTION 'Descriptions must not exceed 2000 characters' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME='groups' THEN
    IF length(NEW.currency)>8 OR length(NEW.read_token)>128 OR length(NEW.write_token)>128 THEN
      RAISE EXCEPTION 'Currency or capability value is too long' USING ERRCODE='23514';
    END IF;
    target_group := NEW.id;
    IF TG_OP='INSERT' THEN
      PERFORM private.consume_write_budget('creations',(SELECT value FROM private.write_limits WHERE name='creations_per_minute'),60);
      PERFORM private.consume_write_budget('creations',(SELECT value FROM private.write_limits WHERE name='creations_per_hour'),3600);
    END IF;
  ELSIF TG_TABLE_NAME IN ('members','expenses') THEN
    target_group := NEW.group_id;
  ELSE
    SELECT e.group_id INTO target_group FROM public.expenses e WHERE e.id=NEW.expense_id;
  END IF;

  IF NOT (TG_TABLE_NAME='groups' AND TG_OP='INSERT') THEN
    IF current_setting('role',true) IN ('anon','authenticated')
       AND NOT private.check_group_access(target_group,true) THEN
      RAISE EXCEPTION 'Write access required' USING ERRCODE='42501';
    END IF;
    -- Serialize group writes before checking per-group counts. A fresh statement
    -- snapshot after the lock sees the previous writer's committed insertion.
    PERFORM 1 FROM public.groups g WHERE g.id=target_group FOR UPDATE;
    PERFORM private.consume_write_budget('group:' || target_group::text,
      (SELECT value FROM private.write_limits WHERE name='group_writes_per_minute'),60);
  END IF;

  IF TG_OP='INSERT' THEN
    IF TG_TABLE_NAME IN ('members','expenses') THEN
      SELECT value INTO cap FROM private.write_limits WHERE name=TG_TABLE_NAME || '_per_group';
      EXECUTE format('SELECT count(*) FROM public.%I WHERE group_id=$1',TG_TABLE_NAME)
        INTO current_count USING target_group;
      IF current_count >= cap THEN
        RAISE EXCEPTION 'This group has reached its capacity limit' USING ERRCODE='P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enforce_write_limits() FROM PUBLIC, anon, authenticated;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['groups','members','expenses','expense_payers','expense_splits'] LOOP
    -- Triggers/counters also cover owner-issued writes. Reapplication reconciles
    -- counters after administrative imports without changing application data.
    EXECUTE format('DROP TRIGGER IF EXISTS enforce_write_limits ON public.%I',table_name);
    EXECUTE format('DROP TRIGGER IF EXISTS track_deleted_rows ON public.%I',table_name);
    EXECUTE format('DROP TRIGGER IF EXISTS track_inserted_rows ON public.%I',table_name);
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',table_name);
    EXECUTE format('INSERT INTO private.write_totals(table_name,total) SELECT %L,count(*) FROM public.%I
      ON CONFLICT (table_name) DO UPDATE SET total=excluded.total',table_name,table_name);
    EXECUTE format('CREATE TRIGGER enforce_write_limits BEFORE INSERT OR UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION private.enforce_write_limits()',table_name);
    EXECUTE format('CREATE TRIGGER track_deleted_rows AFTER DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION private.enforce_write_limits()',table_name);
    EXECUTE format('CREATE TRIGGER track_inserted_rows AFTER INSERT ON public.%I
      FOR EACH ROW EXECUTE FUNCTION private.enforce_write_limits()',table_name);
  END LOOP;
END $$;
COMMIT;
