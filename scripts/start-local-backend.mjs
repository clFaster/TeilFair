import { supabase } from './lib/commands.mjs';
import { checkLocalBackend, localEnvironment } from './lib/local-environment.mjs';

// Capture CLI output: startup normally prints credentials that need not appear
// in the Aspire dashboard or CI logs. Only public settings reach the web app.
supabase(['start'], { stdio: 'pipe' });
supabase(['migration', 'up', '--local'], { stdio: 'pipe' });
const env = localEnvironment();
await checkLocalBackend(env);
console.log(`Local Supabase migrations applied and API ready at ${env.LOCAL_SUPABASE_URL}.`);
