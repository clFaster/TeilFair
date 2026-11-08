-- Enforce group boundaries for expense participants and allow writers to revoke
-- shared links without deleting a group. Existing tokens/data are unchanged.
BEGIN;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['expense_payers','expense_splits'] LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (EXISTS (
      SELECT 1 FROM public.expenses e JOIN public.members m ON m.group_id=e.group_id
      WHERE e.id=expense_id AND m.id=member_id AND private.check_group_access(e.group_id,true)))',
      'Insert ' || table_name || ' with write token', table_name);
    EXECUTE format('ALTER POLICY %I ON public.%I USING (EXISTS (
      SELECT 1 FROM public.expenses e WHERE e.id=expense_id AND private.check_group_access(e.group_id,true)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e JOIN public.members m ON m.group_id=e.group_id
      WHERE e.id=expense_id AND m.id=member_id AND private.check_group_access(e.group_id,true)))',
      'Update ' || table_name || ' with write token', table_name);
  END LOOP;
END $$;
-- A generic error for both nonexistent and foreign-group member IDs avoids
-- using a foreign-key error as a cross-group member existence oracle.
CREATE OR REPLACE FUNCTION private.validate_expense_participant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.expenses e JOIN public.members m ON m.group_id=e.group_id
      WHERE e.id=NEW.expense_id AND m.id=NEW.member_id) THEN
    RAISE EXCEPTION 'Expense participants must belong to the expense group' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validate_expense_participant() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_expense_participant ON public.expense_payers;
CREATE TRIGGER validate_expense_participant BEFORE INSERT OR UPDATE ON public.expense_payers
  FOR EACH ROW EXECUTE FUNCTION private.validate_expense_participant();
DROP TRIGGER IF EXISTS validate_expense_participant ON public.expense_splits;
CREATE TRIGGER validate_expense_participant BEFORE INSERT OR UPDATE ON public.expense_splits
  FOR EACH ROW EXECUTE FUNCTION private.validate_expense_participant();
-- Parent associations are immutable, so reparenting cannot bypass validation.
CREATE OR REPLACE FUNCTION private.prevent_group_reassignment()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    RAISE EXCEPTION 'Moving records between groups is not supported' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.prevent_group_reassignment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_group_reassignment ON public.members;
CREATE TRIGGER prevent_group_reassignment BEFORE UPDATE OF group_id ON public.members
  FOR EACH ROW EXECUTE FUNCTION private.prevent_group_reassignment();
DROP TRIGGER IF EXISTS prevent_group_reassignment ON public.expenses;
CREATE TRIGGER prevent_group_reassignment BEFORE UPDATE OF group_id ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION private.prevent_group_reassignment();
-- The ordinary UPDATE policy deliberately continues to reject changing the write
-- token. This owner-executed RPC checks the OLD token under a row lock instead.
CREATE OR REPLACE FUNCTION public.rotate_group_tokens(
  requested_group_id uuid, new_read_token text, new_write_token text)
RETURNS TABLE(id uuid,name text,currency text,read_token text,write_token text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.rotate_group_tokens(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_group_tokens(uuid,text,text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
