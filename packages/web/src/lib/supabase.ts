import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// One client per capability token, at most as many as the recent-groups list holds.
const MAX_GROUP_CLIENTS = 10;
const groupClients = new Map<string, SupabaseClient>();
let createdClients = 0;

/**
 * Get the Supabase client that sends a group token header
 * This is used for all group-specific operations
 */
export function createGroupClient(token: string) {
  const cached = groupClients.get(token);
  if (cached) return cached;

  createdClients += 1;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    // The app has no user sessions: nothing to store, refresh or read from the URL.
    // Each client keeps its (empty) session under its own key, which never names the token.
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `teilfair-group-client-${createdClients}`,
    },
    global: {
      headers: {
        'x-group-token': token,
      },
    },
  });

  if (groupClients.size >= MAX_GROUP_CLIENTS) {
    const [oldest] = groupClients.keys();
    groupClients.delete(oldest);
  }
  groupClients.set(token, client);
  return client;
}
