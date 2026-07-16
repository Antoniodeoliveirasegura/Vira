# Vira — Feature Roadmap

> Generated from feature research on 2026-07-16. A living doc — reprioritize as things ship.
> Effort labels (Next.js 16 / React 19 / Supabase / Claude): **S** ≈ a few hours (UI + a mutation);
> **M** ≈ new schema + a background job or API surface; **L** ≈ new OAuth scope, external infra, or fiddly logic.

## Executive summary

- **The real risk for a capture-first app is becoming a write-only graveyard.** Capture is already solved in Vira; the *return path* — resurfacing, search, and review — is the gap. Every sticky app in this space (Readwise's daily review, mymind's Serendipity, mem's auto-resurfacing) wins on getting things *out*, not in. Invest there first.
- **Single-user is a superpower for AI cost.** A multi-tenant SaaS rations Claude calls; Vira serves one person, so AI spend is a few dollars a month even if you embed every note, summarize every link, and run a daily + weekly Claude pass. Be *lavish* with AI where a real product couldn't afford to.
- **Two shared pieces of plumbing gate half this roadmap:** a scheduled-job runner (Vercel Cron or Supabase `pg_cron`) and one notification channel (web push or email). The "reminders that fire" work already needs both — build them once and resurfacing, the weekly review, and reminders all ride on the same rails.

---

## High leverage — do soon

### 1. Daily Resurfacing ("still relevant?")
**What:** Each day, surface 3–7 older items — ideas, links, stale tasks — with one-tap *keep / act now / archive*. Selection weighted by age + a decaying "last surfaced" score so nothing rots and nothing spams.
**Why:** The single biggest stickiness mechanism in the category (Readwise's morning review, mymind's Serendipity, mem's auto-resurfacing). For a capture-first app whose whole pitch is "organize later," resurfacing *is* the "later."
**Effort:** M — add `last_surfaced_at` + `surface_count` columns, a weighted-selection query, a review card UI. Delivery piggybacks on #6.
**Deps:** scheduled job + notification channel (#6). Bias toward unprocessed captures and stale open tasks so it doesn't feel random.

### 2. Ask-your-brain semantic search
**What:** Natural-language search — "what did I note about the roof guy?" → semantic match, with an optional Claude-synthesized answer.
**Why:** The payoff for dumping everything into one box is retrieval. Keyword grouping-by-type doesn't scale past a few hundred items; this does (mem Smart Search, Reflect chat-with-notes).
**Effort:** M — Supabase ships `pgvector`; add an embedding column, embed on capture, cosine query, optional Claude answer.
**Deps:** Claude has no embeddings endpoint — the one step outside Anthropic (Voyage AI recommended, or OpenAI/Gemini). Trivial cost solo. Backfill existing rows once.

### 3. Correct-the-classification (inline re-type + edit)  ← in progress
**What:** Every item exposes a one-tap way to change its type, edit the AI-extracted title, and fix a wrong due date.
**Why:** Haiku *will* misclassify. "The ability to correct is a trust signal, not a fallback." A wrong classification with no fix is a dead end that quietly teaches the user not to trust the box — poison for a capture-first app. Cheapest trust win available.
**Effort:** S — UI affordance + an update mutation.
**Deps:** none. Pure upside.

### 4. Frictionless capture everywhere (PWA + share target + hotkey)
**What:** Installable PWA with a **Web Share Target** ("Share → Vira" dumps a URL/text into the inbox) + a global hotkey to focus the capture box.
**Why:** The capture box only helps if you're already in the app; the share target captures the link you're reading on your phone — where `link` items actually originate.
**Effort:** S–M. Stretch: **email-to-inbox** (BCC a private address) is higher value but L (needs an inbound-email webhook).
**Deps:** Share target is solid on Android/Chrome, weaker on iOS Safari.

### 5. AI Weekly Review digest
**What:** Weekly, Claude reads the last 7 days + open/stale tasks → a short digest: what you captured, 3–5 stale items to kill-or-keep, ideas to revisit, what's overdue — each with an inline action.
**Why:** The weekly review is the load-bearing step of every serious system, and the one people skip because it's manual. Pure AI unlock; cadence-extension of the day-suggestion you already ship.
**Effort:** M — scheduled Claude call over the week's rows → digest view/notification.
**Deps:** #6. Keep it actionable (buttons), not a wall of prose.

### 6. Notification / delivery channel (enabler)
**What:** One channel to push things at the user: web push (service worker + VAPID) and/or a daily/weekly email digest.
**Why:** Reminders-that-fire, resurfacing (#1), and the weekly review (#5) are worthless without a way to reach the user when the app is closed.
**Effort:** M. Email (Resend) is the more reliable resurfacing vehicle; web push is better for time-sensitive reminders. Pick one to start.
**Deps:** web push on iOS requires the PWA be installed (ties to #4).

---

## Nice to have

- **7. Voice capture** — mic button → dictate into the capture box, existing classify runs on the transcript. S with browser Web Speech API (Chrome-centric), M with hosted Whisper (better, pennies/clip).
- **8. Auto-enrich links** — on `link` capture, fetch the page → Claude adds a clean title, one-line summary, topic tags. Turns naked URLs into a real read-later shelf. M; watch SSRF hygiene.
- **9. Auto-tags + smart spaces** — classifier also emits 1–3 topic tags (nearly free — fold into the existing call); save any search/tag as a pinned auto-populating "space." M.
- **10. Snooze / recurring / someday bucket** — direct complements to reminders. Snooze + someday are a status + timestamp (S–M); recurrence needs a small rule engine (start weekly/daily only).
- **11. Plan-my-day (calendar-gap suggestions)** — extend the day-suggestion to propose *when* ("free 2–4pm; slot your top task?"). M read-only; **L** if you write blocks back (needs `calendar.events` scope).

---

## Probably skip for a personal app

- **Full Motion-style auto-scheduling / calendar write-back** — brittle, L, overkill for one person. The read-only suggestion (#11) captures 80% of the value.
- **Bidirectional-linking knowledge graph / backlinks** — real engineering for a graph most solo users never curate. Semantic search (#2) delivers the "find related thoughts" payoff without the upkeep.
- **Habit tracker / Pomodoro / Eisenhower matrix / analytics** — separate product categories that fight the capture-first philosophy.
- **Native mobile apps and anything collaborative** — a well-built PWA (#4) covers mobile; there's no second user.

---

## Suggested sequence
Build **#6 (delivery) + #3 (reclassify)** first — cheap, and they unblock trust and every scheduled feature. Then **#1 (resurfacing)** and **#2 (search)** for the return path. **#5 (weekly review)** falls out of #1's plumbing. Layer #4/#7 capture surfaces and #8/#9 enrichment as polish. The through-line: Vira already owns the two hard primitives (AI classification + calendar context) — the best features *compound* those two, and are also the cheapest to build.
