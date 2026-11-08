-- Generated cleanup after restoring 007/008. Current production already has
-- the replacement triggers and no legacy aliases; IF EXISTS keeps that path safe.
BEGIN;
LOCK TABLE public.members, public.expenses IN SHARE ROW EXCLUSIVE MODE;
DO $$ DECLARE parent_table text; BEGIN
  FOREACH parent_table IN ARRAY ARRAY['members','expenses'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid=format('public.%I',parent_table)::regclass
        AND tgname='prevent_group_reassignment' AND tgattr::text=''
        AND tgfoid='private.prevent_group_reassignment()'::regprocedure) THEN
      RAISE EXCEPTION 'Replacement parent-group trigger is missing on %',parent_table;
    END IF;
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS "legacy_prevent_group_reassignment" ON "public"."expenses";

DROP TRIGGER IF EXISTS "legacy_prevent_group_reassignment" ON "public"."members";
COMMIT;
