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

REVOKE ALL ON FUNCTION private.prevent_group_reassignment() FROM PUBLIC;
