import { describe, it, expect } from 'vitest';
import { dueAt, bucketFor, dueNow, isRipe } from '@/lib/reminders';
import { makeItem } from './helpers';

// Fixed reference "now": Jul 15 2026, 2:00 PM local — built from local components, matching how
// the app constructs `now`. Date-only reasoning is local-calendar, so this stays timezone-stable.
const NOW = new Date(2026, 6, 15, 14, 0, 0);
const FAR_FUTURE = '2026-12-31T00:00:00.000Z'; // unambiguously after NOW in any timezone

describe('bucketFor', () => {
  it('date-only due today reads as today (not overdue)', () => {
    expect(bucketFor(makeItem({ type: 'task', metadata: { due_date: '2026-07-15' } }), NOW)).toBe('today');
  });

  it('date-only in the past is overdue', () => {
    expect(bucketFor(makeItem({ type: 'reminder', metadata: { due_date: '2026-07-14' } }), NOW)).toBe('overdue');
  });

  it('date-only in the future is upcoming', () => {
    expect(bucketFor(makeItem({ type: 'task', metadata: { due_date: '2026-07-20' } }), NOW)).toBe('upcoming');
  });

  it('datetime earlier today is overdue', () => {
    expect(bucketFor(makeItem({ type: 'task', metadata: { due_date: '2026-07-15T09:00' } }), NOW)).toBe('overdue');
  });

  it('datetime later today is today', () => {
    expect(bucketFor(makeItem({ type: 'task', metadata: { due_date: '2026-07-15T18:00' } }), NOW)).toBe('today');
  });

  it('ignores non-task/reminder types', () => {
    expect(bucketFor(makeItem({ type: 'note', metadata: { due_date: '2026-07-14' } }), NOW)).toBeNull();
  });

  it('ignores done items', () => {
    expect(bucketFor(makeItem({ type: 'task', status: 'done', metadata: { due_date: '2026-07-14' } }), NOW)).toBeNull();
  });
});

describe('dueNow', () => {
  it('returns overdue + today, soonest first, excluding upcoming', () => {
    const overdue = makeItem({ type: 'task', title: 'overdue', metadata: { due_date: '2026-07-14' } });
    const late = makeItem({ type: 'task', title: 'late', metadata: { due_date: '2026-07-15T20:00' } });
    const upcoming = makeItem({ type: 'task', title: 'future', metadata: { due_date: '2026-07-20' } });
    expect(dueNow([upcoming, late, overdue], NOW).map((i) => i.title)).toEqual(['overdue', 'late']);
  });

  it('excludes snoozed items', () => {
    const snoozed = makeItem({ type: 'task', metadata: { due_date: '2026-07-14', snoozed_until: FAR_FUTURE } });
    expect(dueNow([snoozed], NOW)).toHaveLength(0);
  });
});

describe('isRipe', () => {
  it('overdue is ripe', () => {
    expect(isRipe(makeItem({ type: 'task', metadata: { due_date: '2026-07-14' } }), NOW)).toBe(true);
  });

  it('date-only due today is ripe (no specific time)', () => {
    expect(isRipe(makeItem({ type: 'task', metadata: { due_date: '2026-07-15' } }), NOW)).toBe(true);
  });

  it('datetime later today is not ripe yet', () => {
    expect(isRipe(makeItem({ type: 'task', metadata: { due_date: '2026-07-15T18:00' } }), NOW)).toBe(false);
  });
});

describe('dueAt', () => {
  it('is null without a due_date', () => {
    expect(dueAt(makeItem())).toBeNull();
  });

  it('parses a datetime to its local hour', () => {
    expect(dueAt(makeItem({ metadata: { due_date: '2026-07-15T18:00' } }))?.getHours()).toBe(18);
  });
});
