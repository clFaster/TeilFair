import { checkLocalBackend, localEnvironment } from './lib/local-environment.mjs';

const env = localEnvironment();
await checkLocalBackend(env);
console.log(`Local Supabase and migrated capability RPC ready at ${env.LOCAL_SUPABASE_URL}.`);
