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
    '--schema', 'public,private', '--file', 'schema_consistency', '--no-apply']);
  const generated = readdirSync(migrations).filter(name => !before.has(name));
  for (const name of generated) console.error(readFileSync(join(migrations, name), 'utf8'));
  if (generated.length) throw new Error('Schema declarations differ from migrations. Generate and review a migration.');
  console.log('Declarative application schema matches migration history.');
} finally {
  const parent = resolve(tmpdir()) + sep;
  if (!resolve(scratch).startsWith(parent) || !scratch.includes('teilfair-schema-')) {
    throw new Error('Refusing to remove an unexpected scratch directory.');
  }
  rmSync(scratch, { recursive: true, force: true });
}
