import { describe, it, expect } from 'vitest';
import { freeGaps } from '@/lib/plan';
import type { CalendarEvent } from '@/lib/google';

// timeMin is treated as the local-midnight anchor, and gap labels are offsets from it, so these
// assertions are deterministic regardless of the machine's timezone.
const TIME_MIN = '2026-07-20T00:00:00.000Z';
const MORNING = new Date('2026-07-20T08:00:00.000Z'); // before the 9 AM work start

function ev(start: string, end: string, allDay = false): CalendarEvent {
  return { summary: 'event', start, end, allDay };
}

describe('freeGaps', () => {
  it('returns the whole workday when there are no events', () => {
    expect(freeGaps([], TIME_MIN, MORNING)).toEqual([{ label: '9 AM–6 PM', minutes: 540 }]);
  });

  it('finds the gaps between events', () => {
    const events = [
      ev('2026-07-20T10:00:00.000Z', '2026-07-20T11:00:00.000Z'),
      ev('2026-07-20T14:00:00.000Z', '2026-07-20T15:00:00.000Z'),
    ];
    expect(freeGaps(events, TIME_MIN, MORNING)).toEqual([
      { label: '9 AM–10 AM', minutes: 60 },
      { label: '11 AM–2 PM', minutes: 180 },
      { label: '3 PM–6 PM', minutes: 180 },
    ]);
  });

  it('merges overlapping events', () => {
    const events = [
      ev('2026-07-20T10:00:00.000Z', '2026-07-20T12:00:00.000Z'),
      ev('2026-07-20T11:00:00.000Z', '2026-07-20T13:00:00.000Z'),
    ];
    expect(freeGaps(events, TIME_MIN, MORNING)).toEqual([
      { label: '9 AM–10 AM', minutes: 60 },
      { label: '1 PM–6 PM', minutes: 300 },
    ]);
  });

  it('ignores all-day events', () => {
    expect(freeGaps([ev('2026-07-20', '2026-07-21', true)], TIME_MIN, MORNING)).toEqual([
      { label: '9 AM–6 PM', minutes: 540 },
    ]);
  });

  it('drops sub-30-minute slivers', () => {
    expect(freeGaps([ev('2026-07-20T09:20:00.000Z', '2026-07-20T18:00:00.000Z')], TIME_MIN, MORNING)).toEqual([]);
  });

  it('returns nothing once the workday is over', () => {
    expect(freeGaps([], TIME_MIN, new Date('2026-07-20T19:00:00.000Z'))).toEqual([]);
  });

  it('starts the window at now when now is mid-workday', () => {
    expect(freeGaps([], TIME_MIN, new Date('2026-07-20T14:00:00.000Z'))).toEqual([
      { label: '2 PM–6 PM', minutes: 240 },
    ]);
  });
});
