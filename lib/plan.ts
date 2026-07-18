import { CalendarEvent } from './google';

// Compute the free blocks left in today's workday, so the day-suggestion can propose *when* to
// slot a task. Pure + deterministic — we do the time math here rather than ask the LLM to.
//
// Timezone trick: the client sends timeMin = the user's local midnight expressed as a UTC instant,
// so local hours are just offsets from it. That lets us derive the 9am–6pm window and render clock
// labels ("2–4 PM") in the user's local time without ever knowing the named timezone.

const WORK_START_H = 9; // local 9am
const WORK_END_H = 18; // local 6pm
const MIN_GAP_MIN = 30; // ignore slivers shorter than this

export type FreeGap = { label: string; minutes: number };

export function freeGaps(events: CalendarEvent[], timeMinIso: string, now: Date): FreeGap[] {
  const midnight = new Date(timeMinIso).getTime();
  if (isNaN(midnight)) return [];

  const workStart = midnight + WORK_START_H * 3_600_000;
  const workEnd = midnight + WORK_END_H * 3_600_000;

  // Only the part of the workday still ahead.
  const windowStart = Math.max(workStart, now.getTime());
  if (windowStart >= workEnd) return []; // workday is over

  // Timed events → busy intervals, clipped to the window, sorted, then merged.
  const busy = events
    .filter((e) => !e.allDay)
    .map((e) => [new Date(e.start).getTime(), new Date(e.end).getTime()] as [number, number])
    .filter(([s, e]) => !isNaN(s) && !isNaN(e) && e > windowStart && s < workEnd)
    .map(([s, e]) => [Math.max(s, windowStart), Math.min(e, workEnd)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const [s, e] of busy) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  // Free intervals between the busy blocks within [windowStart, workEnd].
  const gaps: FreeGap[] = [];
  let cursor = windowStart;
  for (const [s, e] of merged) {
    if (s - cursor >= MIN_GAP_MIN * 60_000) gaps.push(toGap(cursor, s, midnight));
    cursor = Math.max(cursor, e);
  }
  if (workEnd - cursor >= MIN_GAP_MIN * 60_000) gaps.push(toGap(cursor, workEnd, midnight));

  return gaps;
}

function toGap(startMs: number, endMs: number, midnight: number): FreeGap {
  return {
    label: `${clock(startMs, midnight)}–${clock(endMs, midnight)}`,
    minutes: Math.round((endMs - startMs) / 60_000),
  };
}

/** Render an instant as a local clock time from its offset since local midnight. */
function clock(ms: number, midnight: number): string {
  const totalMin = Math.round((ms - midnight) / 60_000);
  let h = Math.floor(totalMin / 60);
  const m = ((totalMin % 60) + 60) % 60;
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}
