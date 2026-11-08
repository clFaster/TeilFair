import { supabase } from './lib/commands.mjs';
import { localEnvironment } from './lib/local-environment.mjs';

const names = ['creations_per_minute', 'creations_per_hour'];
// CLI v3 targets the local database unless --remote is explicitly supplied.
const execute = sql => supabase(['db', 'query', sql], { stdio: 'pipe' });
const query = sql => JSON.parse(execute(sql)).rows;

export default async function localTestQuotas() {
  // Independently verify local CLI status; never consume a hosted URL or key.
  localEnvironment();
  const previous = query("SELECT name,value FROM private.write_limits WHERE name IN ('creations_per_minute','creations_per_hour') ORDER BY name");
  if (previous.length !== names.length || previous.some(row =>
    !names.includes(row.name) || !Number.isSafeInteger(Number(row.value)) || Number(row.value) <= 0)) {
    throw new Error('Expected the two local creation quotas from migration 008.');
  }
  // Parallel fixtures create more than ten groups per minute. Keep every
  // authorization check and row cap active; raise only these local test budgets.
  execute("UPDATE private.write_limits SET value=greatest(value,10000) WHERE name IN ('creations_per_minute','creations_per_hour')");
  return async () => {
    const values = previous.map(row => `('${row.name}',${Number(row.value)})`).join(',');
    execute(`UPDATE private.write_limits limits SET value=original.value FROM (VALUES ${values}) AS original(name,value) WHERE limits.name=original.name`);
  };
}
