import { aspire } from './lib/aspire.mjs';
import { supabase } from './lib/commands.mjs';

try {
  aspire(['stop']);
} finally {
  // Aspire does not own the CLI's containers. Preserve development data.
  supabase(['stop']);
}
