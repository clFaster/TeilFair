BEGIN;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.groups, public.members, public.expenses,
    public.expense_payers, public.expense_splits
  FROM anon, authenticated;

COMMIT;