export function assertLocalUrl(value: string): string;
export function localEnvironment(): {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  LOCAL_SUPABASE_URL: string;
  LOCAL_SUPABASE_ANON_KEY: string;
};
export function checkLocalBackend(env?: ReturnType<typeof localEnvironment>): Promise<void>;
