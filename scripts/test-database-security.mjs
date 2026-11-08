import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA extensions;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`);
  // Replay the baseline and every future generated migration on an empty DB.
  // A transaction matches the CLI and keeps SET LOCAL effective for routines
  // whose dependencies are created later in the generated SQL.
  for (const name of readdirSync(new URL('../supabase/migrations/', import.meta.url)).sort()) {
    if (name.endsWith('.sql')) sql(`BEGIN;\n${migration(name)}\nCOMMIT;`);
  }
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
  sql(readFileSync(new URL('../supabase/tests/capability_access.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/expense_cascade.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/group_boundaries.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/expense_writes.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/expense_dates.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/privileges.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/length_limits.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/token_rotation.sql', import.meta.url), 'utf8'));
  sql(readFileSync(new URL('../supabase/tests/write_limits.sql', import.meta.url), 'utf8'));
  console.log('Database security assertions passed on fresh migration replay, including quotas, token rotation and cascades.');
} finally {
  docker(['rm', '--force', container], undefined, true);
}
