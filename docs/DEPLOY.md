# Deploying Vira

Vira runs fine locally with `npm run dev`, but three features only fire on a deployed HTTPS host:
the **daily email digest**, the **weekly review**, and the **Android "Share → Vira"** target
(they need a public URL + a cron scheduler). This guide gets it live on Vercel. ~10 minutes.

See [STATUS.md](STATUS.md) for the current feature set.

---

## Prerequisites

- The repo is already on GitHub (`Antoniodeoliveirasegura/Vira`).
- A **Vercel** account (free Hobby plan is enough).
- A **Resend** API key — sign up at resend.com. The free tier can email *your own* account address
  from `onboarding@resend.dev` with no domain setup, which is all a single-user digest needs.

---

## Step 1 — Import the repo

1. Vercel dashboard → **Add New… → Project** → import the `Vira` GitHub repo.
2. Framework preset auto-detects **Next.js**. Leave build settings at their defaults.
3. **Don't deploy yet** — add the environment variables first (Step 2), or the first build will
   deploy without them and you'll just redeploy.

## Step 2 — Environment variables

In the Vercel project's **Settings → Environment Variables**, add every value from your local
`.env.local`, **plus** the four deploy-only ones at the bottom. (See `.env.example` for the full
annotated list.)

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Same as local. |
| `VOYAGE_API_KEY` | Same as local. |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as local (Supabase is already hosted — no change). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as local. |
| `GOOGLE_CLIENT_ID` | Same as local. |
| `GOOGLE_CLIENT_SECRET` | Same as local. |
| `APP_PASSWORD` | Your login password. |
| `APP_SESSION_SECRET` | Same as local (must match so existing cookies stay valid). |
| `RESEND_API_KEY` | **Deploy-only** — from resend.com. Without it, digests silently no-op. |
| `DIGEST_TO_EMAIL` | **Deploy-only** — where digests are sent (your email). |
| `CRON_SECRET` | **Deploy-only** — a random string (e.g. `openssl rand -hex 32`). Guards the cron routes. |
| `APP_URL` | **Deploy-only** — your Vercel production URL (e.g. `https://vira-xxxx.vercel.app`). Used for the "Open Vira" link in emails. Set after the first deploy gives you the URL, then redeploy. |
| `DIGEST_FROM_EMAIL` | Optional — defaults to `Vira <onboarding@resend.dev>`. |

## Step 3 — Deploy

Trigger the deploy. Once it's green, note your production URL, set `APP_URL` to it (Step 2), and
redeploy so the email links resolve.

---

## Step 4 — Reconnect Google Calendar (the one gotcha)

The Calendar OAuth redirects back to `${origin}/api/auth/callback`, and on the deployed app that
origin is your Vercel URL — not localhost. Supabase will reject the redirect unless the new origin
is allowlisted:

1. Supabase dashboard → **Authentication → URL Configuration → Redirect URLs**.
2. Add `https://<your-vercel-url>/**` (and keep localhost if you still develop locally).
3. On the deployed app, click **Connect Calendar** again to mint a fresh refresh token for that origin.

Google Cloud itself needs **no** change — its OAuth redirect points at Supabase's callback, which is
unchanged by the deploy. (Also note: the OAuth app is still in *testing* mode, so refresh tokens
expire ~7 days — reconnect when Calendar starts 400ing with `invalid_grant`.)

---

## Cron jobs

These auto-register from [`vercel.json`](../vercel.json) — nothing to configure:

| Job | Schedule (UTC) | Local (EDT) |
|---|---|---|
| Daily digest → `/api/cron/digest` | `0 12 * * *` | 8:00 AM |
| Weekly review → `/api/cron/weekly` | `0 13 * * 1` | Mon 9:00 AM |

**Vercel Hobby limits:** max 2 cron jobs, each no more frequent than daily — this is exactly 2, and
weekly ≤ daily, so it fits. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
invocations, which the routes verify.

## Verifying it works

- **Preview the digests without waiting for the cron** (send the bearer, since `CRON_SECRET` is now set):
  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" "https://<your-url>/api/cron/digest?preview=1"   # renders the daily HTML
  curl -H "Authorization: Bearer <CRON_SECRET>" "https://<your-url>/api/cron/weekly?preview=1"    # renders the weekly HTML
  ```
  Drop `?preview=1` to actually send the email.
- **Install the PWA / share target:** open the site in Chrome on Android → "Add to Home screen" →
  then "Share → Vira" from any app drops the link into your inbox.

---

## Security to-do

Rotate the **Anthropic** and **Supabase** secret keys that were pasted in chat during setup, and
update them in both `.env.local` and Vercel. (The Voyage key was only ever in `.env.local`.)
