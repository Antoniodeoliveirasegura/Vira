import { describe, it, expect } from 'vitest';
import { resurfaceCandidates } from '@/lib/resurface';
import { makeItem } from './helpers';

const NOW = new Date('2026-07-15T12:00:00.000Z');
// makeItem defaults created_at to 2026-07-01 (14 days before NOW) — old enough to resurface.

describe('resurfaceCandidates', () => {
  it('includes an old, open, undated, never-surfaced item', () => {
    const item = makeItem({ type: 'idea' });
    expect(resurfaceCandidates([item], NOW).map((i) => i.id)).toEqual([item.id]);
  });

  it('excludes items younger than the min age', () => {
    const fresh = makeItem({ created_at: '2026-07-14T12:00:00.000Z' }); // 1 day old
    expect(resurfaceCandidates([fresh], NOW)).toHaveLength(0);
  });

  it('excludes dated items (reminders own those)', () => {
    const dated = makeItem({ metadata: { due_date: '2026-07-20' } });
    expect(resurfaceCandidates([dated], NOW)).toHaveLength(0);
  });

  it('excludes done and archived items', () => {
    const done = makeItem({ status: 'done' });
    const archived = makeItem({ status: 'archived' });
    expect(resurfaceCandidates([done, archived], NOW)).toHaveLength(0);
  });

  it('excludes items surfaced within the cooldown window', () => {
    const recent = makeItem({ last_surfaced_at: '2026-07-13T12:00:00.000Z' }); // 2 days ago
    expect(resurfaceCandidates([recent], NOW)).toHaveLength(0);
  });

  it('re-includes items surfaced before the cooldown', () => {
    const old = makeItem({ last_surfaced_at: '2026-07-01T12:00:00.000Z' }); // 14 days ago
    expect(resurfaceCandidates([old], NOW)).toHaveLength(1);
  });

  it('excludes snoozed items', () => {
    const snoozed = makeItem({ metadata: { snoozed_until: '2026-12-31T00:00:00.000Z' } });
    expect(resurfaceCandidates([snoozed], NOW)).toHaveLength(0);
  });

  it('floats never-surfaced + oldest to the top', () => {
    const newerUnsurfaced = makeItem({ created_at: '2026-07-05T12:00:00.000Z' });
    const olderUnsurfaced = makeItem({ created_at: '2026-07-02T12:00:00.000Z' });
    const surfacedLongAgo = makeItem({ last_surfaced_at: '2026-07-02T12:00:00.000Z' });
    const order = resurfaceCandidates([newerUnsurfaced, surfacedLongAgo, olderUnsurfaced], NOW);
    expect(order.map((i) => i.id)).toEqual([olderUnsurfaced.id, newerUnsurfaced.id, surfacedLongAgo.id]);
  });

  it('caps the result at the limit', () => {
    const many = Array.from({ length: 8 }, () => makeItem({ type: 'idea' }));
    expect(resurfaceCandidates(many, NOW)).toHaveLength(5);
  });
});
