import { describe, it, expect } from 'vitest';
import { digestSubject, renderDigest, renderWeekly } from '@/lib/email';
import { makeItem } from './helpers';

const NOW = new Date('2026-07-15T12:00:00.000Z');

describe('digestSubject', () => {
  it('summarizes due + resurface counts', () => {
    const due = [makeItem(), makeItem()];
    const resurface = [makeItem()];
    expect(digestSubject(due, resurface)).toBe('Vira · 2 due · 1 to review');
  });

  it('falls back when there is nothing', () => {
    expect(digestSubject([], [])).toBe('Vira · nothing pressing');
  });
});

describe('renderDigest', () => {
  it('includes item titles', () => {
    const due = [makeItem({ title: 'Pay rent', type: 'task', metadata: { due_date: '2026-07-14' } })];
    const resurface = [makeItem({ title: 'Old idea' })];
    const html = renderDigest(due, resurface, NOW);
    expect(html).toContain('Pay rent');
    expect(html).toContain('Old idea');
  });

  it('escapes HTML in titles', () => {
    const due = [makeItem({ title: '<b>xss</b>', type: 'task', metadata: { due_date: '2026-07-14' } })];
    const html = renderDigest(due, [], NOW);
    expect(html).toContain('&lt;b&gt;xss&lt;/b&gt;');
    expect(html).not.toContain('<b>xss</b>');
  });
});

describe('renderWeekly', () => {
  it('escapes and preserves line breaks', () => {
    const html = renderWeekly('Line one\nLine two & <x>', NOW);
    expect(html).toContain('Line one<br>Line two &amp; &lt;x&gt;');
  });
});
