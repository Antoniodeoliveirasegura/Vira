# Vira

**Capture first. Organize later.**

Vira is a single-user "capture-first" inbox. You dump a raw thought into one box and Claude turns it into a structured item (task, idea, link, reminder, note, or question) with a clean title and metadata, so capturing never breaks your flow. It also reads your Google Calendar and uses Claude to suggest how to spend your day.

## Features

- **One-box capture** — type anything; Claude classifies it into `task | idea | link | reminder | note | question`, extracts a title, and pulls structured metadata (URLs, due dates).
- **AI day suggestion** — given today's calendar events and your open tasks, Claude writes one short, useful suggestion (a free gap to fill, what to prioritize, an unusually heavy day).
- **Google Calendar sync** — OAuth refresh-token flow; today's events shown inline.
- **Single-user auth** — password gate with a signed session, no public sign-up.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** for storage and the OAuth token vault (`@supabase/ssr`)
- **Claude** via `@anthropic-ai/sdk` (Haiku for classification and suggestions)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

All secrets are read from the environment, see [.env.example](.env.example) for the full list:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (classification + day suggestions) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (anon/public key only) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth for Calendar access |
| `APP_PASSWORD` | Single-user login password |
| `APP_SESSION_SECRET` | Secret used to sign the session cookie |

Supabase tables expected: `items` (captured items) and `google_tokens` (the Google refresh token).

## Notes

This is a personal project (v0.2). Auth is intentionally single-user, the Supabase **anon** key is the only client-side credential, and all privileged calls run server-side through Next.js route handlers.
