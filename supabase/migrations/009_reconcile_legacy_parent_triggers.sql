-- Replay bridge for restored migrations 007/008. This runs before the dated
-- group-boundary migration. Preserve the old protection under a distinct name
-- until that migration installs its replacement. On current production the
-- replacement has no UPDATE OF columns, so this is a no-op.
BEGIN;
LOCK TABLE public.members, public.expenses IN SHARE ROW EXCLUSIVE MODE;
DO $bridge$ DECLARE parent_table text; upgraded boolean:=false; BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=''20261104181342'')' INTO upgraded;
  END IF;
  FOREACH parent_table IN ARRAY ARRAY['members','expenses'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid=format('public.%I',parent_table)::regclass
        AND tgname='prevent_group_reassignment'
        AND tgfoid='private.prevent_group_reassignment()'::regprocedure
        AND tgattr::text<>''
    ) THEN
      IF upgraded THEN
        -- An existing local DB may have applied the dated migration before the
        -- missing 007 was recovered. Restore its current helper and trigger.
        EXECUTE $restore$CREATE OR REPLACE FUNCTION private.prevent_group_reassignment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- Parent group IDs are immutable, including for privileged callers. This
  -- prevents later moves and concurrent moves from invalidating child checks.
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    RAISE EXCEPTION 'Records cannot be moved between groups' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;$restore$;
        EXECUTE format('CREATE OR REPLACE TRIGGER prevent_group_reassignment BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.prevent_group_reassignment()',parent_table);
      ELSE
        EXECUTE format('ALTER TRIGGER prevent_group_reassignment ON public.%I RENAME TO legacy_prevent_group_reassignment',parent_table);
      END IF;
    END IF;
  END LOOP;
END $bridge$;
COMMIT;
