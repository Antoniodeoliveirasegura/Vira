import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ClassifyResult = {
  type: 'task' | 'idea' | 'link' | 'reminder' | 'note' | 'question';
  title: string;
  metadata: Record<string, string>;
};

export async function suggestDay(
  events: { summary: string; start: string; end: string; allDay: boolean }[],
  openTasks: { title: string }[],
  gaps: { label: string; minutes: number }[] = [],
): Promise<string> {
  if (events.length === 0 && openTasks.length === 0) return '';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `Given today's calendar, the user's open tasks, and their remaining free time blocks, write ONE short, natural sentence suggesting how to use the day. When there are free blocks AND open tasks, prefer proposing a specific block for a specific task — e.g. "You're free 2–4 PM — good window to knock out <task>." Otherwise fall back to a useful observation: which task to prioritize, or an unusually light or heavy schedule. Plain text. One sentence. No lists. No preamble, no quotes. If you genuinely have nothing useful to say, respond with the single word: SKIP`,
      messages: [
        {
          role: 'user',
          content: `Today's events:\n${
            events.length
              ? events
                  .map((e) =>
                    e.allDay
                      ? `- ${e.summary} (all day)`
                      : `- ${e.summary} (${e.start} → ${e.end})`,
                  )
                  .join('\n')
              : '(none)'
          }\n\nFree blocks left today:\n${
            gaps.length
              ? gaps.map((g) => `- ${g.label} (${g.minutes} min)`).join('\n')
              : '(none available or calendar not connected)'
          }\n\nOpen tasks:\n${
            openTasks.length ? openTasks.map((t) => `- ${t.title}`).join('\n') : '(none)'
          }`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    if (text === 'SKIP' || !text) return '';
    return text;
  } catch {
    return '';
  }
}

/** Normalize model-emitted tags: lowercase, de-hashed, comma-free, deduped, max 3. */
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const tag = String(t).toLowerCase().trim().replace(/[#,]/g, '').slice(0, 24);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
    if (out.length === 3) break;
  }
  return out;
}

export async function classify(rawInput: string): Promise<ClassifyResult> {
  const fallback: ClassifyResult = {
    type: 'note',
    title: rawInput.slice(0, 60),
    metadata: {},
  };

  try {
    const when = new Date().toString();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You classify user notes into structured items. Respond with ONLY a JSON object, no markdown, no explanation.

The current date and time is ${when}. Resolve relative dates ("today", "tomorrow", "next Friday", "in 2 hours") against it, and express any due_date in that same local timezone as an ISO 8601 string WITHOUT a "Z" suffix — "YYYY-MM-DD" for a day, "YYYY-MM-DDTHH:MM" for a specific time.

The JSON must have these fields:
- "type": one of task|idea|link|reminder|note|question
- "title": a 3-8 word title summarizing the note
- "tags": an array of 1-3 short lowercase topic tags (single words or short phrases) capturing the subject — e.g. ["finance","taxes"]. Use [] if nothing is clearly on-topic.
- "metadata": an object (can be empty {})

Classification rules:
- "link" if the input contains a URL → add {"url": "<the url>"} to metadata
- "task" if it describes an action to take → if a date or time is stated, add {"due_date": "<ISO 8601 date or datetime>"} to metadata; never invent one
- "reminder" if it's time-anchored but not an action → if a date or time is stated, add {"due_date": "<ISO 8601 date or datetime>"} to metadata; never invent one
- "question" if it's something to research or find out
- "idea" for thoughts, concepts, or brainstorms
- "note" as the fallback when nothing else fits

Return only the raw JSON object.`,
      messages: [{ role: 'user', content: rawInput }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as ClassifyResult & { tags?: unknown };

    if (!parsed.type || !parsed.title) return fallback;

    // Fold tags into metadata as a comma-joined string — fits the jsonb + Record<string,string>
    // shape, so it stores, displays, and filters with no schema change.
    const tags = normalizeTags(parsed.tags);
    const metadata = tags.length
      ? { ...(parsed.metadata ?? {}), tags: tags.join(',') }
      : parsed.metadata ?? {};
    return { type: parsed.type, title: parsed.title, metadata };
  } catch {
    return fallback;
  }
}

type MatchLite = { title: string; raw_input: string; type: string };

/**
 * Synthesize a short answer to `query` from the user's own matched notes. On-demand
 * only (not per search) and capped, so the Claude cost stays tiny. Grounds strictly in
 * the provided notes and cites them by number; returns '' on empty input or failure.
 */
export async function answerFromMatches(query: string, matches: MatchLite[]): Promise<string> {
  if (!matches.length) return '';

  try {
    const notes = matches
      .map((m, i) => {
        const detail = m.raw_input && m.raw_input !== m.title ? ` — ${m.raw_input}` : '';
        return `[${i + 1}] (${m.type}) ${m.title}${detail}`;
      })
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Answer the user's question using ONLY their saved notes below. Be concise — 1-3 sentences, plain text, no preamble. Cite the note(s) you used by bracketed number, e.g. [2]. If the notes don't actually answer the question, say so in one sentence.`,
      messages: [{ role: 'user', content: `Question: ${query}\n\nMy saved notes:\n${notes}` }],
    });

    return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  } catch (e) {
    console.error('answerFromMatches error:', e);
    return '';
  }
}

type Captured = { title: string; type: string };
type OpenItem = { title: string; type: string; due: string };

/**
 * Weekly review: Claude reads the past week's captures and the current open pile and writes a
 * short, actionable digest — what you captured, what's overdue, older items worth revisiting,
 * and a few stale ones to kill-or-keep. Plain text (lib/email renders it). Returns '' on failure
 * or an empty week.
 * ponytail: Haiku for consistency + cost (one call/week); swap the model to Sonnet if the
 * summary reads thin — it's a one-line change and this is the app's showcase AI moment.
 */
export async function weeklyReview(captured: Captured[], open: OpenItem[]): Promise<string> {
  if (!captured.length && !open.length) return '';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You write a person's weekly review for their personal capture inbox. Be concise and actionable: short sections with bullets, name specific items, and for stale ones suggest kill-or-keep. No preamble, no motivational filler. Plain text only — use "•" for bullets and a blank line between sections. Include these sections only when they have content: "This week you captured" (themes and counts, not a raw dump), "Overdue" (anything past due), "Worth revisiting" (older open ideas/notes/questions), "Kill or keep" (3-5 stale items to decide on). If there's very little to say, keep it to a sentence or two.`,
      messages: [
        {
          role: 'user',
          content: `Captured in the last 7 days:\n${
            captured.length ? captured.map((c) => `- (${c.type}) ${c.title}`).join('\n') : '(nothing)'
          }\n\nOpen items right now:\n${
            open.length
              ? open.map((o) => `- (${o.type}) ${o.title}${o.due ? ` [${o.due}]` : ''}`).join('\n')
              : '(none)'
          }`,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  } catch (e) {
    console.error('weeklyReview error:', e);
    return '';
  }
}

/**
 * One-line summary of a captured link, from the page's text. Turns naked URLs into a read-later
 * shelf. Kept short and cheap (Haiku, ~1 sentence). Returns '' on failure — the caller degrades.
 */
export async function summarizeLink(url: string, pageText: string): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      system: `Summarize the linked page in ONE concise sentence (max 25 words): what it is and why someone might have saved it. Plain text, no preamble, no quotes. If the text is too thin to tell, respond with the single word: SKIP`,
      messages: [{ role: 'user', content: `URL: ${url}\n\nPage text:\n${pageText.slice(0, 4000)}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return text === 'SKIP' ? '' : text;
  } catch (e) {
    console.error('summarizeLink error:', e);
    return '';
  }
}
