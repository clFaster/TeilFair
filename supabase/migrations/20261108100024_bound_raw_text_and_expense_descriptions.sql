BEGIN;
LOCK TABLE public.groups, public.members, public.expenses IN SHARE ROW EXCLUSIVE MODE;
SET local check_function_bodies = off;

ALTER TABLE "public"."expenses"
  DROP CONSTRAINT "expenses_description_length";

ALTER TABLE "public"."groups"
  DROP CONSTRAINT "groups_name_length";

ALTER TABLE "public"."members"
  DROP CONSTRAINT "members_name_length";

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
      (payload->>'expense_date')::timestamptz) RETURNING * INTO saved;
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
      expense_date=(payload->>'expense_date')::timestamptz,revision=revision+1
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

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_description_length" CHECK (((char_length(description) >= 1) AND (char_length(description) <= 250) AND (description ~ '[^[:space:]]'::text)));

ALTER TABLE "public"."groups"
  ADD CONSTRAINT "groups_currency_format" CHECK ((currency ~ '^[A-Z]{3}$'::text));

ALTER TABLE "public"."groups"
  ADD CONSTRAINT "groups_name_length" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100) AND (name ~ '[^[:space:]]'::text)));

ALTER TABLE "public"."members"
  ADD CONSTRAINT "members_name_length" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100) AND (name ~ '[^[:space:]]'::text)));

COMMIT;
