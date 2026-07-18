import { describe, it, expect } from 'vitest';
import { normalizeTags } from '@/lib/claude';

describe('normalizeTags', () => {
  it('lowercases and trims', () => {
    expect(normalizeTags(['Finance', '  TAXES  '])).toEqual(['finance', 'taxes']);
  });

  it('dedupes', () => {
    expect(normalizeTags(['work', 'work', 'home'])).toEqual(['work', 'home']);
  });

  it('strips leading # and commas', () => {
    expect(normalizeTags(['#work', 'a,b'])).toEqual(['work', 'ab']);
  });

  it('caps at three tags', () => {
    expect(normalizeTags(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c']);
  });

  it('drops empties', () => {
    expect(normalizeTags(['', '   ', 'real'])).toEqual(['real']);
  });

  it('returns [] for non-array input', () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags('finance')).toEqual([]);
  });
});
