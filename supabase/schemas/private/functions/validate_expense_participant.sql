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
