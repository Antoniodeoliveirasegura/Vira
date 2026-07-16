import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { embed } from '@/lib/embeddings';

// One-shot backfill: embed every item that doesn't have an embedding yet.
// Gated by the app password (middleware). Safe to re-run — it only touches nulls.
export async function POST() {
  const db = getSupabase();

  const { data: items, error } = await db.from('items').select('id, raw_input').is('embedding', null);
  if (error) {
    console.error('reindex fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let embedded = 0;
  for (const item of items ?? []) {
    const vector = await embed(item.raw_input, 'document');
    if (!vector) continue;
    const { error: upErr } = await db.from('items').update({ embedding: vector }).eq('id', item.id);
    if (upErr) {
      console.error('reindex update error:', upErr.message);
      continue;
    }
    embedded++;
  }

  return NextResponse.json({ scanned: items?.length ?? 0, embedded });
}
