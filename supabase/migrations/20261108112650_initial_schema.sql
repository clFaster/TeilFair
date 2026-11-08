-- Initial application schema generated from supabase/schemas/ with the pinned CLI.
-- Edit declarative files for future DDL, then run pnpm db:diff --file <name>.
-- Supabase supplies these extensions locally; declare them for fresh installs too.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

CREATE SCHEMA "private";

CREATE TABLE "private"."write_budgets" (
  "scope"          text                     NOT NULL,
  "period_seconds" integer                  NOT NULL,
  "starts_at"      timestamp with time zone NOT NULL,
  "used"           bigint                   NOT NULL,
  CONSTRAINT "write_budgets_pkey" PRIMARY KEY (scope, period_seconds)
);

CREATE TABLE "private"."write_limits" (
  "name"  text   NOT NULL,
  "value" bigint NOT NULL,
  CONSTRAINT "write_limits_pkey" PRIMARY KEY (name),
  CONSTRAINT "write_limits_value_check" CHECK ((value > 0))
);

CREATE TABLE "private"."write_totals" (
  "table_name" text   NOT NULL,
  "total"      bigint NOT NULL,
  CONSTRAINT "write_totals_pkey" PRIMARY KEY (table_name),
  CONSTRAINT "write_totals_total_check" CHECK ((total >= 0))
);

CREATE TABLE "public"."expense_payers" (
  "id"         uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "expense_id" uuid          NOT NULL,
  "member_id"  uuid          NOT NULL,
  "amount"     numeric(12,2) NOT NULL,
  CONSTRAINT "expense_payers_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "expense_payers_expense_id_member_id_key" UNIQUE (expense_id, member_id),
  CONSTRAINT "expense_payers_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."expense_payers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."expense_splits" (
  "id"         uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "expense_id" uuid          NOT NULL,
  "member_id"  uuid          NOT NULL,
  "share"      numeric(12,4) NOT NULL,
  "share_type" text          NOT NULL,
  CONSTRAINT "expense_splits_expense_id_member_id_key" UNIQUE (expense_id, member_id),
  CONSTRAINT "expense_splits_pkey" PRIMARY KEY (id),
  CONSTRAINT "expense_splits_share_check" CHECK ((share > (0)::numeric)),
  CONSTRAINT "expense_splits_share_type_check" CHECK ((share_type = ANY (ARRAY['ratio'::text, 'fixed'::text, 'percentage'::text])))
);

ALTER TABLE "public"."expense_splits"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."expenses" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "group_id"     uuid                     NOT NULL,
  "description"  text                     NOT NULL,
  "total_amount" numeric(12,2)            NOT NULL,
  "expense_date" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "revision"     integer                  NOT NULL DEFAULT 1,
  CONSTRAINT "expenses_date_range" CHECK ((isfinite(expense_date) AND (expense_date >= '0001-01-01 00:00:00+00'::timestamp
    with time zone) AND (expense_date < '10000-01-01 00:00:00+00'::timestamp with time zone))),
  CONSTRAINT "expenses_description_length" CHECK ((((char_length(description) >= 1) AND (char_length(description) <= 250)) AND (description ~ '[^[:space:]]'::text))),
  CONSTRAINT "expenses_pkey" PRIMARY KEY (id),
  CONSTRAINT "expenses_revision_check" CHECK ((revision > 0)),
  CONSTRAINT "expenses_total_amount_check" CHECK ((total_amount > (0)::numeric))
);

ALTER TABLE "public"."expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."groups" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name"        text                     NOT NULL,
  "currency"    text                     NOT NULL DEFAULT 'EUR'::text,
  "read_token"  text                     NOT NULL,
  "write_token" text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "groups_currency_format" CHECK ((currency ~ '^[A-Z]{3}$'::text)),
  CONSTRAINT "groups_name_length" CHECK ((((char_length(name) >= 1) AND (char_length(name) <= 100)) AND (name ~ '[^[:space:]]'::text))),
  CONSTRAINT "groups_pkey" PRIMARY KEY (id),
  CONSTRAINT "read_token_length" CHECK (((char_length(read_token) >= 32) AND (char_length(read_token) <= 128))),
  CONSTRAINT "tokens_different" CHECK ((read_token <> write_token)),
  CONSTRAINT "write_token_length" CHECK (((char_length(write_token) >= 32) AND (char_length(write_token) <= 128)))
);

ALTER TABLE "public"."groups"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."members" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "group_id"   uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "members_name_length" CHECK ((((char_length(name) >= 1) AND (char_length(name) <= 100)) AND (name ~ '[^[:space:]]'::text))),
  CONSTRAINT "members_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."members"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.check_group_access (
  group_id      uuid,
  require_write boolean DEFAULT false
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = group_id
          AND (public.get_token() = g.write_token
               OR (NOT require_write AND public.get_token() = g.read_token))
    );
$function$;

CREATE OR REPLACE FUNCTION private.consume_write_budget (
  budget_scope text,
  max_requests bigint,
  seconds      integer
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
END $function$;

CREATE OR REPLACE FUNCTION private.enforce_expense_member_group()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  -- Invoker visibility deliberately rejects references to inaccessible parents.
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses e JOIN public.members m ON m.group_id = e.group_id
    WHERE e.id = NEW.expense_id AND m.id = NEW.member_id
  ) THEN
    RAISE EXCEPTION 'Expense and member must belong to the same accessible group'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_write_limits()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
END $function$;

CREATE OR REPLACE FUNCTION private.prevent_group_reassignment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  -- Parent group IDs are immutable, including for privileged callers. This
  -- prevents later moves and concurrent moves from invalidating child checks.
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    RAISE EXCEPTION 'Records cannot be moved between groups' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.validate_expense_participant()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.expenses e JOIN public.members m ON m.group_id=e.group_id
      WHERE e.id=NEW.expense_id AND m.id=NEW.member_id) THEN
    RAISE EXCEPTION 'Expense participants must belong to the expense group' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.get_group (
  requested_group_id uuid
)
  RETURNS TABLE (
    id          uuid,
    name        text,
    currency    text,
    read_token  text,
    write_token text,
    created_at  timestamp with time zone
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
    SELECT g.id, g.name, g.currency, g.read_token,
           CASE WHEN public.get_token() = g.write_token THEN g.write_token ELSE ''::text END,
           g.created_at
    FROM public.groups g
    WHERE g.id = requested_group_id
      AND (public.get_token() = g.read_token OR public.get_token() = g.write_token);
$function$;

CREATE OR REPLACE FUNCTION public.get_token()
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
    SELECT NULLIF(NULLIF(current_setting('request.headers', true), '')::json->>'x-group-token', '');
$function$;

CREATE OR REPLACE FUNCTION public.rotate_group_tokens (
  requested_group_id uuid,
  new_read_token     text,
  new_write_token    text
)
  RETURNS TABLE (
    id          uuid,
    name        text,
    currency    text,
    read_token  text,
    write_token text,
    created_at  timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE previous public.groups%ROWTYPE;
BEGIN
  SELECT g.* INTO previous FROM public.groups g WHERE g.id=requested_group_id FOR UPDATE;
  IF NOT FOUND OR public.get_token() IS DISTINCT FROM previous.write_token THEN
    RAISE EXCEPTION 'Write access required' USING ERRCODE='42501';
  END IF;
  IF new_read_token IS NULL OR new_write_token IS NULL
     OR new_read_token !~ '^[A-Za-z0-9]{32}$' OR new_write_token !~ '^[A-Za-z0-9]{32}$'
     OR new_read_token=new_write_token
     OR new_read_token IN (previous.read_token,previous.write_token)
     OR new_write_token IN (previous.read_token,previous.write_token) THEN
    RAISE EXCEPTION 'Two fresh, distinct capability tokens are required' USING ERRCODE='22023';
  END IF;
  RETURN QUERY UPDATE public.groups g SET read_token=new_read_token,write_token=new_write_token
    WHERE g.id=requested_group_id
    RETURNING g.id,g.name,g.currency,g.read_token,g.write_token,g.created_at;
END $function$;

CREATE OR REPLACE FUNCTION public.save_expense (
  requested_group_id   uuid,
  requested_expense_id uuid,
  payload              jsonb,
  expected_revision    integer
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  saved public.expenses;
  expense_timestamp timestamptz;
  total numeric;
  paid numeric;
  allocated numeric;
  fixed_amount numeric;
  percentages numeric;
  ratios integer;
  ratio_weight numeric;
BEGIN
  IF NOT private.check_group_access(requested_group_id, true) THEN
    RAISE EXCEPTION 'Write access required' USING ERRCODE = '42501';
  END IF;
  IF expected_revision IS NULL OR expected_revision < 0 OR requested_expense_id IS NULL
    OR jsonb_typeof(payload) IS DISTINCT FROM 'object'
    OR jsonb_typeof(payload->'payers') IS DISTINCT FROM 'array'
    OR jsonb_typeof(payload->'splits') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid expense payload' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(payload->'payers') NOT BETWEEN 1 AND 200
    OR jsonb_array_length(payload->'splits') NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Expense requires 1 to 200 payers and splits' USING ERRCODE = '22023';
  END IF;
  total := (payload->>'total_amount')::numeric;
  IF total IS NULL OR total::text IN ('NaN','Infinity','-Infinity')
    OR total <= 0 OR total <> round(total,2) OR total >= 10000000000
    OR length(coalesce(payload->>'description','')) NOT BETWEEN 1 AND 250
    OR payload->>'description' !~ '[^[:space:]]'
    OR payload->>'expense_date' IS NULL THEN
    RAISE EXCEPTION 'Invalid expense details' USING ERRCODE = '22023';
  END IF;
  BEGIN
    expense_timestamp := (payload->>'expense_date')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Invalid expense date' USING ERRCODE = '22023';
  END;
  IF NOT isfinite(expense_timestamp)
    OR expense_timestamp < '0001-01-01 00:00:00+00'::timestamptz
    OR expense_timestamp >= '10000-01-01 00:00:00+00'::timestamptz THEN
    RAISE EXCEPTION 'Expense date must be between years 1 and 9999' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(payload->'payers') AS p(member_id uuid, amount numeric)
      WHERE p.member_id IS NULL OR p.amount IS NULL OR p.amount::text IN ('NaN','Infinity','-Infinity')
      OR p.amount <= 0 OR p.amount <> round(p.amount,2))
    OR EXISTS (SELECT 1 FROM jsonb_to_recordset(payload->'splits') AS s(member_id uuid, share numeric, share_type text)
      WHERE s.member_id IS NULL OR s.share IS NULL OR s.share::text IN ('NaN','Infinity','-Infinity')
      OR s.share <= 0 OR s.share <> round(s.share,4)
      OR s.share_type IS NULL OR s.share_type NOT IN ('ratio','fixed','percentage')) THEN
    RAISE EXCEPTION 'Invalid payer or split' USING ERRCODE = '22023';
  END IF;
  SELECT sum(amount) INTO paid FROM jsonb_to_recordset(payload->'payers') AS p(amount numeric);
  SELECT coalesce(sum(CASE WHEN share_type='fixed' THEN share
      WHEN share_type='percentage' THEN total*share/100 ELSE 0 END),0),
    coalesce(sum(share) FILTER (WHERE share_type='fixed'),0),
    coalesce(sum(share) FILTER (WHERE share_type='percentage'),0),
    count(*) FILTER (WHERE share_type='ratio'),
    coalesce(sum(share) FILTER (WHERE share_type='ratio'),0)
    INTO allocated, fixed_amount, percentages, ratios, ratio_weight
    FROM jsonb_to_recordset(payload->'splits') AS s(share numeric, share_type text);
  IF paid <> total OR percentages > 100 OR fixed_amount > total
    OR allocated - total > 0.01
    OR (ratios=0 AND abs(allocated-total) > 0.01)
    OR (ratios > 0 AND ratio_weight <= 0) THEN
    RAISE EXCEPTION 'Payments and allocations must match the expense total' USING ERRCODE = '22023';
  END IF;

  IF expected_revision = 0 THEN
    INSERT INTO public.expenses(id,group_id,description,total_amount,expense_date)
    VALUES(requested_expense_id,requested_group_id,payload->>'description',total,
      expense_timestamp) RETURNING * INTO saved;
  ELSE
    SELECT * INTO saved FROM public.expenses
      WHERE id=requested_expense_id AND group_id=requested_group_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Expense not found' USING ERRCODE = '42501';
    END IF;
    IF saved.revision <> expected_revision THEN
      RAISE EXCEPTION 'Expense changed. Reload before saving again.' USING ERRCODE = '40001';
    END IF;
    UPDATE public.expenses SET description=payload->>'description',total_amount=total,
      expense_date=expense_timestamp,revision=revision+1
      WHERE id=requested_expense_id RETURNING * INTO saved;
    DELETE FROM public.expense_payers WHERE expense_id=requested_expense_id;
    DELETE FROM public.expense_splits WHERE expense_id=requested_expense_id;
  END IF;
  INSERT INTO public.expense_payers(expense_id,member_id,amount)
    SELECT saved.id,p.member_id,p.amount FROM jsonb_to_recordset(payload->'payers') AS p(member_id uuid,amount numeric);
  INSERT INTO public.expense_splits(expense_id,member_id,share,share_type)
    SELECT saved.id,s.member_id,s.share,s.share_type FROM jsonb_to_recordset(payload->'splits') AS s(member_id uuid,share numeric,share_type text);
  RETURN jsonb_build_object('expense',to_jsonb(saved),
    'payers',(SELECT jsonb_agg(to_jsonb(p)) FROM public.expense_payers p WHERE expense_id=saved.id),
    'splits',(SELECT jsonb_agg(to_jsonb(s)) FROM public.expense_splits s WHERE expense_id=saved.id));
END;
$function$;

ALTER TABLE "public"."expense_payers"
  ADD CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE "public"."expense_splits"
  ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE "public"."members"
  ADD CONSTRAINT "members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE "public"."expense_payers"
  ADD CONSTRAINT "expense_payers_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(id);

ALTER TABLE "public"."expense_splits"
  ADD CONSTRAINT "expense_splits_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(id);

CREATE INDEX idx_expense_payers_expense_id ON public.expense_payers USING btree (expense_id);

CREATE INDEX idx_expense_payers_member_id ON public.expense_payers USING btree (member_id);

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits USING btree (expense_id);

CREATE INDEX idx_expense_splits_member_id ON public.expense_splits USING btree (member_id);

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);

CREATE INDEX idx_expenses_group_id ON public.expenses USING btree (group_id);

CREATE INDEX idx_groups_read_token ON public.groups USING btree (read_token);

CREATE INDEX idx_groups_write_token ON public.groups USING btree (write_token);

CREATE INDEX idx_members_group_id ON public.members USING btree (group_id);

CREATE TRIGGER enforce_expense_member_group
  BEFORE INSERT OR UPDATE ON public.expense_payers
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_expense_member_group();

CREATE TRIGGER enforce_write_limits
  BEFORE INSERT OR UPDATE ON public.expense_payers
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_deleted_rows
  AFTER DELETE ON public.expense_payers
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_inserted_rows
  AFTER INSERT ON public.expense_payers
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER validate_expense_participant
  BEFORE INSERT OR UPDATE ON public.expense_payers
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_expense_participant();

CREATE TRIGGER enforce_expense_member_group
  BEFORE INSERT OR UPDATE ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_expense_member_group();

CREATE TRIGGER enforce_write_limits
  BEFORE INSERT OR UPDATE ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_deleted_rows
  AFTER DELETE ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_inserted_rows
  AFTER INSERT ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER validate_expense_participant
  BEFORE INSERT OR UPDATE ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_expense_participant();

CREATE TRIGGER enforce_write_limits
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER prevent_group_reassignment
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_group_reassignment();

CREATE TRIGGER track_deleted_rows
  AFTER DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_inserted_rows
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER enforce_write_limits
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_deleted_rows
  AFTER DELETE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_inserted_rows
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER enforce_write_limits
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER prevent_group_reassignment
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_group_reassignment();

CREATE TRIGGER track_deleted_rows
  AFTER DELETE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE TRIGGER track_inserted_rows
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_write_limits();

CREATE POLICY "Delete expense_payers with write token" ON "public"."expense_payers"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Insert expense_payers with write token" ON "public"."expense_payers"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.expenses e
     JOIN public.members m ON ((m.group_id = e.group_id)))
  WHERE ((e.id = expense_payers.expense_id) AND (m.id = expense_payers.member_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Read expense_payers with valid group token" ON "public"."expense_payers"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, false)))));

CREATE POLICY "Update expense_payers with write token" ON "public"."expense_payers"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND private.check_group_access(e.group_id, true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.expenses e
     JOIN public.members m ON ((m.group_id = e.group_id)))
  WHERE ((e.id = expense_payers.expense_id) AND (m.id = expense_payers.member_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Delete expense_splits with write token" ON "public"."expense_splits"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Insert expense_splits with write token" ON "public"."expense_splits"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.expenses e
     JOIN public.members m ON ((m.group_id = e.group_id)))
  WHERE ((e.id = expense_splits.expense_id) AND (m.id = expense_splits.member_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Read expense_splits with valid group token" ON "public"."expense_splits"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, false)))));

CREATE POLICY "Update expense_splits with write token" ON "public"."expense_splits"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_splits.expense_id) AND private.check_group_access(e.group_id, true)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.expenses e
     JOIN public.members m ON ((m.group_id = e.group_id)))
  WHERE ((e.id = expense_splits.expense_id) AND (m.id = expense_splits.member_id) AND private.check_group_access(e.group_id, true)))));

CREATE POLICY "Delete expenses with write token" ON "public"."expenses"
  FOR DELETE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

CREATE POLICY "Insert expenses with write token" ON "public"."expenses"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (private.check_group_access(group_id, true));

CREATE POLICY "Read expenses with valid group token" ON "public"."expenses"
  FOR SELECT
  TO PUBLIC
  USING (private.check_group_access(group_id, false));

CREATE POLICY "Update expenses with write token" ON "public"."expenses"
  FOR UPDATE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

CREATE POLICY "Anyone can create groups" ON "public"."groups"
  FOR INSERT
  TO PUBLIC
  WITH
    CHECK
    (((length(read_token) >= 32) AND (length(write_token) >= 32) AND (read_token <> write_token) AND (TRIM(BOTH FROM read_token) <> ''::text) AND (TRIM(BOTH FROM write_token) <>
    ''::text)));

CREATE POLICY "Delete groups with write token" ON "public"."groups"
  FOR DELETE
  TO PUBLIC
  USING ((public.get_token() = write_token));

CREATE POLICY "Read groups with valid token" ON "public"."groups"
  FOR SELECT
  TO PUBLIC
  USING (((public.get_token() = read_token) OR (public.get_token() = write_token)));

CREATE POLICY "Update groups with write token" ON "public"."groups"
  FOR UPDATE
  TO PUBLIC
  USING ((public.get_token() = write_token));

CREATE POLICY "Delete members with write token" ON "public"."members"
  FOR DELETE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

CREATE POLICY "Insert members with write token" ON "public"."members"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (private.check_group_access(group_id, true));

CREATE POLICY "Read members with valid group token" ON "public"."members"
  FOR SELECT
  TO PUBLIC
  USING (private.check_group_access(group_id, false));

CREATE POLICY "Update members with write token" ON "public"."members"
  FOR UPDATE
  TO PUBLIC
  USING (private.check_group_access(group_id, true));

REVOKE ALL ON FUNCTION "private"."check_group_access"(uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."check_group_access"(uuid, boolean) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "private"."check_group_access"(uuid, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."check_group_access"(uuid, boolean) TO "postgres";

REVOKE ALL ON FUNCTION "private"."consume_write_budget"(text, bigint, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."consume_write_budget"(text, bigint, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."consume_write_budget"(text, bigint, integer) TO "postgres";

REVOKE ALL ON FUNCTION "private"."enforce_expense_member_group"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."enforce_expense_member_group"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."enforce_expense_member_group"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."enforce_write_limits"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."enforce_write_limits"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."enforce_write_limits"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."prevent_group_reassignment"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."prevent_group_reassignment"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."prevent_group_reassignment"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."validate_expense_participant"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."validate_expense_participant"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."validate_expense_participant"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_group"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_group"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_group"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_group"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_group"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_token"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_token"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_token"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_token"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_token"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."rotate_group_tokens"(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."rotate_group_tokens"(uuid, text, text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rotate_group_tokens"(uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rotate_group_tokens"(uuid, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rotate_group_tokens"(uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."save_expense"(uuid, uuid, jsonb, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."save_expense"(uuid, uuid, jsonb, integer) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."save_expense"(uuid, uuid, jsonb, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_expense"(uuid, uuid, jsonb, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_expense"(uuid, uuid, jsonb, integer) TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."expense_payers" FROM "anon";

GRANT SELECT ON TABLE "public"."expense_payers" TO "anon";

REVOKE ALL ON TABLE "public"."expense_payers" FROM "authenticated";

GRANT SELECT ON TABLE "public"."expense_payers" TO "authenticated";

REVOKE ALL ON TABLE "public"."expense_payers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_payers" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_payers" TO "service_role";

REVOKE ALL ON TABLE "public"."expense_splits" FROM "anon";

GRANT SELECT ON TABLE "public"."expense_splits" TO "anon";

REVOKE ALL ON TABLE "public"."expense_splits" FROM "authenticated";

GRANT SELECT ON TABLE "public"."expense_splits" TO "authenticated";

REVOKE ALL ON TABLE "public"."expense_splits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_splits" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_splits" TO "service_role";

REVOKE ALL ON TABLE "public"."expenses" FROM "anon";

GRANT DELETE, SELECT ON TABLE "public"."expenses" TO "anon";

REVOKE ALL ON TABLE "public"."expenses" FROM "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."expenses" TO "authenticated";

REVOKE ALL ON TABLE "public"."expenses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "service_role";

REVOKE ALL ON TABLE "public"."groups" FROM "anon";

REVOKE ALL ("created_at") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("created_at") ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("currency") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("currency") ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("id") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("id") ON TABLE "public"."groups" TO "anon";

REVOKE ALL ("name") ON TABLE "public"."groups" FROM "anon";

GRANT SELECT ("name") ON TABLE "public"."groups" TO "anon";

GRANT DELETE, INSERT, UPDATE ON TABLE "public"."groups" TO "anon";

REVOKE ALL ON TABLE "public"."groups" FROM "authenticated";

REVOKE ALL ("created_at") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("created_at") ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ("currency") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("currency") ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."groups" FROM "authenticated";

GRANT SELECT ("name") ON TABLE "public"."groups" TO "authenticated";

GRANT DELETE, INSERT, UPDATE ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ON TABLE "public"."groups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "service_role";

REVOKE ALL ON TABLE "public"."members" FROM "anon";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."members" TO "anon";

REVOKE ALL ON TABLE "public"."members" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."members" TO "authenticated";

REVOKE ALL ON TABLE "public"."members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."members" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."members" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE ALL ON FUNCTIONS FROM PUBLIC;

-- Required application data is not captured by declarative schema diffs.
-- Keep these defaults in the baseline (not optional development seeds).
INSERT INTO private.write_limits(name,value) VALUES
  ('groups_rows',2000),('members_rows',20000),('expenses_rows',50000),
  ('expense_payers_rows',100000),('expense_splits_rows',250000),
  ('members_per_group',100),('expenses_per_group',1000),
  ('creations_per_minute',10),('creations_per_hour',100),('group_writes_per_minute',600)
ON CONFLICT (name) DO NOTHING;

INSERT INTO private.write_totals(table_name,total) VALUES
  ('groups',0),('members',0),('expenses',0),('expense_payers',0),('expense_splits',0);
