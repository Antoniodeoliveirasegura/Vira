# Vira — Status

_Last updated: 2026-07-16_

Single-user, capture-first productivity inbox. Type a thought → Claude classifies it →
it's searchable, resurfaced, and reminds you. See [roadmap.md](roadmap.md) for what's next.

## Run it

```bash
cd F:/github/Vira
npm run dev          # → http://localhost:3000
```

Secrets live in `.env.local` (gitignored). Required keys:

| Key | For |
|---|---|
| `ANTHROPIC_API_KEY` | classify + synthesized answers (Haiku) |
| `VOYAGE_API_KEY` | embeddings (`voyage-4-lite`, free tier) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DB |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Calendar (Supabase-brokered OAuth) |
| `APP_PASSWORD` | the login gate — **this is the "forgot password" reset** |
| `APP_SESSION_SECRET` | signs the `vira_auth` cookie = HMAC-SHA256(secret, password) |

## Stack

Next.js 16.2.6 (App Router, Turbopack) · React 19 · TS · Tailwind v4 ·
Supabase (`@supabase/ssr`, pgvector) · Claude `claude-haiku-4-5-20251001` · Voyage embeddings.

## Database (Supabase — all migrations already applied)

- `items` — id, created_at, raw_input, type (task/idea/link/reminder/note/question),
  title, status (open/done/archived), metadata jsonb, `last_surfaced_at`, `embedding vector(1024)`
- `google_tokens` — refresh_token
- RLS **on** with permissive `anon` policies (`vira items access` / `vira tokens access`)
- pgvector extension + HNSW index + `match_items(query_embedding, match_count)` RPC

No pending migrations. Schema and code are in sync.

## Shipped this session

| Feature | Key files |
|---|---|
| Reminders that fire (browser notifications, due buckets) | `lib/reminders.ts`, `components/DueSection.tsx` |
| Inline reclassify / edit (title + type) | `components/ItemCard.tsx`, `app/api/items/route.ts` (PATCH) |
| Daily resurfacing | `lib/resurface.ts`, `components/ResurfacePanel.tsx` |
| Semantic search | `lib/embeddings.ts`, `app/api/search`, `app/api/reindex`, `components/SearchBox.tsx` |
| Synthesized answers (on-demand ✨, per-request cost) | `app/api/answer`, `answerFromMatches` in `lib/claude.ts` |

## Next (from roadmap)

- **#6 Delivery channel** — email or web-push via cron, so reminders/resurfacing fire when the app is closed. Shared plumbing for both.
- **#4 PWA + share target** — mobile capture.

## Known loose ends

- **SECURITY:** rotate the **Anthropic** + **Supabase** secret keys that were pasted in chat earlier. (Voyage key was handled correctly via `.env.local`.)
- Next 16 warns `middleware` → `proxy` (cosmetic, not fixed).
- Google OAuth is in testing mode → refresh tokens expire ~7 days; reconnect Calendar when it 400s with `invalid_grant`.
