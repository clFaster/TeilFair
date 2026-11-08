import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { root, supabase } from './lib/commands.mjs';

// Run generation in a copy: checks never write migrations into the working tree
// or copy the local CLI linkage to a hosted project.
const scratch = mkdtempSync(join(tmpdir(), 'teilfair-schema-'));
try {
  for (const entry of ['config.toml', 'migrations', 'schemas']) {
    cpSync(join(root, 'supabase', entry), join(scratch, 'supabase', entry), { recursive: true });
  }
  const migrations = join(scratch, 'supabase', 'migrations');
  const before = new Set(readdirSync(migrations));
  supabase(['db', 'schema', 'declarative', 'sync', '--workdir', scratch,
    '--file', 'schema_consistency', '--no-apply']);
  const generated = readdirSync(migrations).filter(name => !before.has(name));
  // The pinned pg-delta engine re-emits routines even after replaying its own
  // output. Accept only exact declaration text, preserving bodies and literals.
  const declarations = readdirSync(join(scratch, 'supabase', 'schemas'), { recursive: true })
    .filter(name => name.endsWith('.sql'))
    .map(name => readFileSync(join(scratch, 'supabase', 'schemas', name), 'utf8').replaceAll('\r\n', '\n'));
  const baseline = [...before].sort().map(name => readFileSync(join(migrations, name), 'utf8')
    .replaceAll('\r\n', '\n')).join('\n');
  const duplicateNames = [
    'private.check_group_access', 'private.enforce_expense_member_group',
    'private.prevent_group_reassignment', 'public.get_group', 'public.get_token', 'public.save_expense',
  ];
  for (const name of generated) {
    let diff = readFileSync(join(migrations, name), 'utf8').replaceAll('\r\n', '\n');
    diff = diff.replace(/^SET local check_function_bodies = off;\s*/, '');
    diff = diff.replace(/CREATE OR REPLACE FUNCTION ([\w.]+)[\s\S]*?\$function\$;/g, (statement, routine) => {
      if (!duplicateNames.includes(routine)) return statement;
      // The latest definition in the migration baseline must also be byte-identical.
      // Comparing only with the desired declaration would hide real body changes.
      const start = baseline.lastIndexOf(`CREATE OR REPLACE FUNCTION ${routine}`);
      const end = baseline.indexOf('$function$;', baseline.indexOf('$function$', start) + 10);
      const latest = start < 0 || end < 0 ? '' : baseline.slice(start, end + 11);
      const laterDrop = /DROP\s+FUNCTION/i.test(baseline.slice(start));
      return !laterDrop && latest === statement && declarations.some(source => source.includes(statement))
        ? '' : statement;
    });
    if (diff.trim()) {
      console.error(diff);
      throw new Error('Schema declarations differ from migrations. Generate and review a migration.');
    }
  }
  console.log('Declarative application schema matches migration history.');
} finally {
  const parent = resolve(tmpdir()) + sep;
  if (!resolve(scratch).startsWith(parent) || !scratch.includes('teilfair-schema-')) {
    throw new Error('Refusing to remove an unexpected scratch directory.');
  }
  rmSync(scratch, { recursive: true, force: true });
}
