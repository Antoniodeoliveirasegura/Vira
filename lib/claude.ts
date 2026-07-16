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
): Promise<string> {
  if (events.length === 0 && openTasks.length === 0) return '';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `Given today's calendar events and the user's open tasks, write ONE short sentence suggesting how to use the day. Examples: point out a free gap that could fit a task, suggest which task to prioritize, note an unusually light or heavy schedule. Plain text. One sentence. No lists. No preamble — just the sentence itself, no quotes. If you genuinely have nothing useful to say, respond with the single word: SKIP`,
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

The JSON must have exactly these fields:
- "type": one of task|idea|link|reminder|note|question
- "title": a 3-8 word title summarizing the note
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
    const parsed = JSON.parse(cleaned) as ClassifyResult;

    if (!parsed.type || !parsed.title) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}
