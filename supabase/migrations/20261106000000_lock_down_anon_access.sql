-- Lock the tables down to the server.
--
-- Before: RLS was on, but permissive policies let the public anon key (which ships in the
-- browser bundle) read, edit and delete every item and read the Google refresh token.
-- After: anon and authenticated get nothing. The app's route handlers use the secret
-- (service role) key, which bypasses RLS, so the app keeps working.
--
-- Run this ONLY after the deploy that sets SUPABASE_SECRET_KEY is live, or the app will
-- see an empty inbox. Safe to re-run.

alter table public.items enable row level security;
alter table public.google_tokens enable row level security;

drop policy if exists "vira items access" on public.items;
drop policy if exists "vira tokens access" on public.google_tokens;

revoke all on table public.items from anon, authenticated;
revoke all on table public.google_tokens from anon, authenticated;

-- Functions are executable by PUBLIC by default; keep semantic search server-only too.
revoke execute on function public.match_items from public, anon, authenticated;
grant execute on function public.match_items to service_role;

grant all on table public.items to service_role;
grant all on table public.google_tokens to service_role;

-- Check: both lines below should list no policies, and anon should have no grants.
-- select tablename, policyname from pg_policies where schemaname = 'public';
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated');
