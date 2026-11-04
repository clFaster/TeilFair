BEGIN;
SET LOCAL plpgsql.check_asserts = on;

CREATE TABLE public.f5_privilege_probe(id integer);
CREATE FUNCTION public.f5_privilege_probe() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;

DO $$
DECLARE
  role_name text;
  table_name text;
  privilege_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH table_name IN ARRAY ARRAY['groups', 'members', 'expenses', 'expense_payers', 'expense_splits'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'] LOOP
        ASSERT NOT has_table_privilege(role_name, format('public.%I', table_name), privilege_name),
          format('%s unexpectedly has %s on public.%s', role_name, privilege_name, table_name);
      END LOOP;
    END LOOP;
    FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'] LOOP
      ASSERT NOT has_table_privilege(role_name, 'public.f5_privilege_probe', privilege_name),
        format('%s unexpectedly has %s on a newly created table', role_name, privilege_name);
    END LOOP;
    ASSERT NOT has_function_privilege(role_name, 'public.f5_privilege_probe()', 'EXECUTE'),
      format('%s unexpectedly has execute on a newly created function', role_name);
  END LOOP;
END $$;

ROLLBACK;