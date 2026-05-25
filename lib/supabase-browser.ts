import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client that stores PKCE state in cookies, so the
// server route handler in /api/auth/callback can complete the OAuth exchange.
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
