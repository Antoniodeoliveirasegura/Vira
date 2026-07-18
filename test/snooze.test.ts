import { describe, it, expect } from 'vitest';
import { isSnoozed, snoozeLabel, snoozeOptions } from '@/lib/snooze';
import { makeItem } from './helpers';

const NOW = new Date('2026-07-15T12:00:00.000Z');

describe('isSnoozed', () => {
  it('is true when snoozed_until is in the future', () => {
    expect(isSnoozed(makeItem({ metadata: { snoozed_until: '2026-07-15T18:00:00.000Z' } }), NOW)).toBe(true);
  });

  it('is false when snoozed_until is in the past', () => {
    expect(isSnoozed(makeItem({ metadata: { snoozed_until: '2026-07-15T06:00:00.000Z' } }), NOW)).toBe(false);
  });

  it('is false when there is no snooze', () => {
    expect(isSnoozed(makeItem(), NOW)).toBe(false);
  });
});

describe('snoozeOptions', () => {
  it('offers four presets, all in the future', () => {
    const opts = snoozeOptions(NOW);
    expect(opts).toHaveLength(4);
    for (const o of opts) {
      expect(new Date(o.until).getTime()).toBeGreaterThan(NOW.getTime());
      expect(o.label).toBeTruthy();
    }
    expect(opts.map((o) => o.label)).toEqual(['1 hour', 'This evening', 'Tomorrow', 'Next week']);
  });
});

describe('snoozeLabel', () => {
  it('renders a "until …" label for a snoozed item', () => {
    const item = makeItem({ metadata: { snoozed_until: '2026-07-16T15:00:00.000Z' } });
    expect(snoozeLabel(item, NOW)).toMatch(/^until /);
  });

  it('is empty when not snoozed', () => {
    expect(snoozeLabel(makeItem(), NOW)).toBe('');
  });
});
