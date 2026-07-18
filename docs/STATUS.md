# Vira — Status

_Last updated: 2026-07-18 — feature roadmap complete._

Single-user, capture-first productivity inbox. Type or dictate a thought → Claude classifies it →
it's tagged, searchable, resurfaced, reminds you (snooze-able), summarizes the links you save,
suggests when to slot tasks against your calendar, and (once deployed) emails you a daily digest +
weekly review. See [roadmap.md](roadmap.md) for the original plan.

## Run it

```bash
cd F:/github/Vira
npm run dev          # → http://localhost:3000
```

Secrets live in `.env.local` (gitignored). Keys:

| Key | For |
|---|---|
| `ANTHROPIC_API_KEY` | classify, synthesized answers, weekly review (Haiku) |
| `VOYAGE_API_KEY` | embeddings (`voyage-4-lite`, free tier) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DB |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Calendar (Supabase-brokered OAuth) |
| `APP_PASSWORD` | the login gate — **this is the "forgot password" reset** |
| `APP_SESSION_SECRET` | signs the `vira_auth` cookie = HMAC-SHA256(secret, password) |
| `RESEND_API_KEY` + `DIGEST_TO_EMAIL` | email digests (deploy-only; digests no-op without them) |
| `CRON_SECRET` | Bearer token guarding `/api/cron/*` (set in Vercel) |
| `DIGEST_FROM_EMAIL` / `APP_URL` | optional — sender address, "Open Vira" link |

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

## Shipped

Full roadmap "high-leverage" tier is done:

| Feature | Key files |
|---|---|
| Reminders that fire (in-app notifications, due buckets) | `lib/reminders.ts`, `components/DueSection.tsx` |
| Inline reclassify / edit (title + type) | `components/ItemCard.tsx`, `app/api/items/route.ts` |
| Daily resurfacing | `lib/resurface.ts`, `components/ResurfacePanel.tsx` |
| Semantic search + synthesized answers | `lib/embeddings.ts`, `app/api/{search,answer,reindex}`, `components/SearchBox.tsx` |
| Email delivery channel (daily digest) | `lib/email.ts`, `app/api/cron/digest/route.ts`, `vercel.json` |
| AI weekly review | `weeklyReview` in `lib/claude.ts`, `app/api/cron/weekly/route.ts` |
| PWA + Android share target | `app/manifest.ts`, `app/icons/[size]/route.tsx`, `app/share/route.ts`, `lib/capture.ts` |
| Auto-enrich links (AI summary) | `lib/enrich.ts`, `summarizeLink` in `lib/claude.ts`, `lib/capture.ts` |
| Auto-tags + click-to-filter | `classify` in `lib/claude.ts`, `components/ItemCard.tsx`, `components/ItemList.tsx` |
| Snooze until later | `lib/snooze.ts`, `app/api/items/route.ts`, `components/ItemCard.tsx`, `components/DueSection.tsx`, `components/ItemList.tsx` |
| Voice capture (Web Speech) | `components/CaptureBox.tsx` |
| Plan-my-day (calendar-gap slotting) | `lib/plan.ts`, `suggestDay` in `lib/claude.ts`, `app/api/day-suggestion/route.ts` |

`lib/capture.ts` holds the shared capture core (classify + embed + insert), used by both the
capture API and the share target. Cron routes (`/api/cron/*`) are exempt from the login gate in
`middleware.ts` and guarded by `CRON_SECRET`; `/manifest.webmanifest` + `/icons` are public so the
OS can fetch them at install.

## Deploy to activate the async features

The daily digest, weekly review, and Android "Share → Vira" only run on a deployed HTTPS host:

1. Get a **Resend** API key (free tier emails your own address from `onboarding@resend.dev`).
2. Import the GitHub repo into **Vercel** (~2 min for a Next app).
3. In Vercel set all `.env.local` vars **plus** `RESEND_API_KEY`, `DIGEST_TO_EMAIL`, and a random `CRON_SECRET`.
   Crons auto-register from `vercel.json` (daily digest `0 12 * * *`, weekly review `0 13 * * 1` — 2 crons, within Hobby limits).

## What's left

The roadmap's high-leverage tier (#1–6) and every nice-to-have (#7–11) are shipped. Only these
deliberately-deferred pieces remain — pick up any of them later:

- **Recurring reminders** — needs a small rule engine (the heavier half of roadmap #10).
- **Someday bucket** — indefinite park, distinct from timed snooze (#10).
- **Saved "spaces"** — pin a tag or search as an auto-populating view (#9 stretch).
- **Calendar write-back** — actually create the time block; needs the `calendar.events` scope (#11's L version).
- **Hosted Whisper** — higher-accuracy, cross-browser voice vs. the browser Web Speech API (#7's M version).

Plus the one non-code to-do: **deploy to Vercel** (see above) to activate the digests + share target.

## Known loose ends

- **SECURITY:** rotate the **Anthropic** + **Supabase** secret keys pasted in chat earlier. (Voyage key handled correctly via `.env.local`.)
- Next 16 warns `middleware` → `proxy` (cosmetic, not fixed).
- Google OAuth is in testing mode → refresh tokens expire ~7 days; reconnect Calendar when it 400s with `invalid_grant`.
- Web Share Target is **Android/Chrome only** (iOS Safari doesn't support it) and needs the HTTPS deploy — not testable from a phone against localhost.
