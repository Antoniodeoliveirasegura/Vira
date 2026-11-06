import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type { Item } from './types';

// Server-only database client. It authenticates with the Supabase secret (service role) key,
// which bypasses RLS, so the tables can deny the public anon key entirely. The anon key still
// ships to the browser, but only for the Supabase Auth handshake behind "Connect Calendar"
// (lib/supabase-browser.ts); it no longer grants any table access.
//
// SUPABASE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so Next never inlines it into client
// bundles. The window check makes an accidental client import fail loudly instead of quietly.

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabase() is server-only; call an /api route from the browser instead');
  }
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
