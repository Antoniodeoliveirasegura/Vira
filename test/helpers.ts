import type { Item } from '@/lib/supabase';

let seq = 0;

/** Build an Item with sensible defaults; override only the fields a test cares about. */
export function makeItem(partial: Partial<Item> = {}): Item {
  seq += 1;
  return {
    id: `item-${seq}`,
    created_at: '2026-07-01T12:00:00.000Z',
    raw_input: 'raw input',
    type: 'note',
    title: 'A note',
    status: 'open',
    metadata: {},
    last_surfaced_at: null,
    ...partial,
  };
}
