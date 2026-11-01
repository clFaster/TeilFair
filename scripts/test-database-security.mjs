import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const container = `teilfair-security-test-${process.pid}-${Date.now()}`;
function docker(args, input, quiet = false) {
  const result = spawnSync('docker', args, { cwd: root, input, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Docker failed');
  if (!quiet && result.stdout) process.stdout.write(result.stdout);
  return result.stdout;
}
function sql(source) {
  docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], source);
}
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
try {
  // No exposed ports, host mounts, or existing database connections.
  docker(['run', '--detach', '--rm', '--name', container, '-e', 'POSTGRES_PASSWORD=disposable-test-only', 'postgres:17-alpine'], undefined, true);
  docker(['exec', container, 'sh', '-c', 'until pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 1; done'], undefined, true);
  sql(`CREATE ROLE anon; CREATE ROLE authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`);
  for (const name of ['000_reset.sql','001_initial_schema.sql','002_change_expense_date_to_timestamptz.sql','003_fix_security_warnings.sql']) sql(migration(name));
  sql(`INSERT INTO public.groups(id,name,read_token,write_token) VALUES
    ('00000000-0000-4000-8000-000000000001','Existing group',repeat('r',32),repeat('w',32)),
    ('00000000-0000-4000-8000-000000000002','Other group',repeat('x',32),repeat('y',32));
    INSERT INTO public.members(id,group_id,name) VALUES
    ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Existing member');
    INSERT INTO public.expenses(id,group_id,description,total_amount) VALUES
    ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Existing expense',10);
    INSERT INTO public.expense_payers(expense_id,member_id,amount) VALUES
    ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',10);
    INSERT INTO public.expense_splits(expense_id,member_id,share,share_type) VALUES
    ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'ratio');`);
  sql(migration('004_harden_capability_access.sql'));
  sql(migration('005_index_member_foreign_keys.sql'));
  sql(migration('005_index_member_foreign_keys.sql')); // Safe to reapply.
  sql(migration('006_private_access_helper.sql'));
  sql(migration('006_private_access_helper.sql')); // Safe to reapply.
  const assertions = readFileSync(new URL('../supabase/tests/capability_access.sql', import.meta.url), 'utf8');
  const cascadeAssertions = readFileSync(new URL('../supabase/tests/expense_cascade.sql', import.meta.url), 'utf8');
  sql(assertions);
  sql(cascadeAssertions);
  // Reproduce an interrupted old reset: policies removed and RLS disabled.
  sql(`DO $$ DECLARE p record; BEGIN
    FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    END LOOP;
    END $$;
    ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.expense_payers DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;`);
  sql(migration('004_harden_capability_access.sql'));
  sql(migration('004_harden_capability_access.sql')); // Safe to reapply.
  sql(migration('006_private_access_helper.sql'));
  sql(assertions);
  sql(cascadeAssertions);
  console.log('Database security assertions passed, including cascades, reset recovery and reapplication.');
} finally {
  docker(['rm', '--force', container], undefined, true);
}
