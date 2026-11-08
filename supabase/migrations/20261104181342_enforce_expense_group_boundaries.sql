BEGIN;
LOCK TABLE public.members, public.expenses, public.expense_payers, public.expense_splits
  IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT expense_id, member_id FROM public.expense_payers
      UNION ALL SELECT expense_id, member_id FROM public.expense_splits
    ) child
    JOIN public.expenses e ON e.id = child.expense_id
    JOIN public.members m ON m.id = child.member_id
    WHERE e.group_id <> m.group_id
  ) THEN
    RAISE EXCEPTION 'Resolve existing cross-group expense participants before applying this migration';
  END IF;
END $$;
SET local check_function_bodies = off;

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

CREATE TRIGGER enforce_expense_member_group
  BEFORE INSERT OR UPDATE ON public.expense_payers
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_expense_member_group();

CREATE TRIGGER enforce_expense_member_group
  BEFORE INSERT OR UPDATE ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_expense_member_group();

CREATE TRIGGER prevent_group_reassignment
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_group_reassignment();

CREATE TRIGGER prevent_group_reassignment
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_group_reassignment();

REVOKE ALL ON FUNCTION "private"."enforce_expense_member_group"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."prevent_group_reassignment"() FROM PUBLIC;

COMMIT;
