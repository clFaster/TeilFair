// Review evidence, not a passing security gate: assertions reproduce current gaps.
// Run from the repository root: node docs/security-review-2026-11-04.probe.mjs
// Uses only a new disposable PostgreSQL container; no ports, mounts or hosted credentials.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const container = `teilfair-review-${process.pid}-${Date.now()}`;
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 120_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}
const sql = source => docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], source);
let started = false;
try {
  docker(['run', '--detach', '--rm', '--name', container, '-e', 'POSTGRES_PASSWORD=disposable-review-only', 'postgres:17-alpine']);
  started = true;
  docker(['exec', container, 'sh', '-c', 'until pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 1; done']);
  // Same starting public-role grants as the existing database security harness.
  sql(`CREATE ROLE anon; CREATE ROLE authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`);
  for (const name of ['001_initial_schema.sql', '002_change_expense_date_to_timestamptz.sql',
    '003_fix_security_warnings.sql', '004_harden_capability_access.sql',
    '005_index_member_foreign_keys.sql', '006_private_access_helper.sql']) {
    sql(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  process.stdout.write(sql(`
    BEGIN;
    SET plpgsql.check_asserts = on;
    INSERT INTO public.groups(id,name,read_token,write_token) VALUES
      ('00000000-0000-4000-8000-000000000001','A',repeat('r',32),repeat('w',32)),
      ('00000000-0000-4000-8000-000000000002','B',repeat('s',32),repeat('x',32));
    INSERT INTO public.members(id,group_id,name) VALUES
      ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Member A'),
      ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Member B');
    INSERT INTO public.expenses(id,group_id,description,total_amount) VALUES
      ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Expense A',10);
    SET LOCAL ROLE anon;
    SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
    DO $$ BEGIN
      ASSERT (SELECT count(*) = 0 FROM public.members WHERE group_id='00000000-0000-4000-8000-000000000002');
      ASSERT (SELECT count(*) = 0 FROM public.get_group('00000000-0000-4000-8000-000000000002'));
    END $$;
    -- A writer knows B's member UUID but has no B capability.
    INSERT INTO public.expense_payers(expense_id,member_id,amount) VALUES
      ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',999);
    INSERT INTO public.expense_splits(expense_id,member_id,share,share_type) VALUES
      ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',200,'percentage');
    DO $$ BEGIN
      ASSERT (SELECT count(*) = 1 FROM public.expense_payers);
      ASSERT (SELECT count(*) = 1 FROM public.expense_splits);
      ASSERT (SELECT sum(amount) = 999 FROM public.expense_payers);
    END $$;
    SELECT 'REPRODUCED: foreign-group member references and invalid expense totals accepted' AS evidence;
    -- Foreign-key existence can be distinguished even though B cannot be read.
    DO $$ BEGIN
      BEGIN
        INSERT INTO public.expense_payers(expense_id,member_id,amount) VALUES
          ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000099',1);
        RAISE EXCEPTION 'Expected foreign key error';
      EXCEPTION WHEN foreign_key_violation THEN NULL;
      END;
      BEGIN
        UPDATE public.groups SET write_token=repeat('z',32) WHERE id='00000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'Expected direct write-token rotation to be denied';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END $$;
    SELECT 'REPRODUCED: direct write-token rotation rejected by current policy' AS evidence;
    SET LOCAL request.headers = '{"x-group-token":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}';
    DELETE FROM public.members WHERE id='10000000-0000-4000-8000-000000000002';
    SET LOCAL request.headers = '{"x-group-token":"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"}';
    DO $$ BEGIN
      ASSERT (SELECT count(*) = 0 FROM public.expense_payers);
      ASSERT (SELECT count(*) = 0 FROM public.expense_splits);
    END $$;
    SELECT 'REPRODUCED: deleting B member cascades to A expense children' AS evidence;
    SET LOCAL request.headers = '{}';
    DO $$ BEGIN
      ASSERT has_table_privilege('anon','public.groups','TRUNCATE');
      ASSERT has_table_privilege('authenticated','public.groups','TRUNCATE');
    END $$;
    -- SQL-role demonstration only; there is no generic TRUNCATE REST endpoint.
    TRUNCATE public.groups CASCADE;
    RESET ROLE;
    DO $$ BEGIN ASSERT (SELECT count(*) = 0 FROM public.groups); END $$;
    SELECT 'REPRODUCED: anon SQL role can truncate all application tables without a token' AS evidence;
    ROLLBACK;
  `));
} finally {
  if (started) docker(['rm', '--force', container]);
}

// Execute the actual store source with Node type stripping, resolving its TS import.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '../calculations' && context.parentURL?.endsWith('/store/groupStore.ts')) {
      return next(new URL('../calculations.ts', context.parentURL).href, context);
    }
    return next(specifier, context);
  },
});
const { createGroupStoreState } = await import('../packages/shared/src/store/groupStore.ts');
const group = { id: 'A', name: 'Previously authorized A', currency: 'EUR', readToken: 'read-A', writeToken: 'write-A', createdAt: new Date() };
let state;
let mutation;
const api = {
  getTokenPermission: async (_id, token) => token === 'write-A' ? 'write' : null,
  getGroup: async () => group,
  getMembers: async () => [],
  getExpenses: async () => [],
  addMember: async (...args) => { mutation = args; return { id: 'member', groupId: 'A', name: args[2] }; },
};
state = createGroupStoreState(api,
  partial => { state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) }; },
  () => state);
assert.equal(await state.loadGroup('A', 'write-A'), true);
assert.equal(await state.loadGroup('B', 'invalid-B'), false);
assert.equal(state.group.id, 'A');
assert.equal(state.permission, 'write');
assert.equal(state.token, 'write-A');
await state.addMember('Mistakenly added while viewing B route');
assert.equal(mutation[0], 'A');
assert.equal(mutation[1], 'write-A');
console.log('REPRODUCED: failed B load retains A data, write capability and mutation target');
console.log('Review reproductions complete. These confirmations describe gaps, not security approval.');
