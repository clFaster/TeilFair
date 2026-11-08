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

REVOKE ALL ON FUNCTION private.enforce_expense_member_group() FROM PUBLIC;
