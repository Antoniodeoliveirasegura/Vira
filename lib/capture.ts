import { getSupabase, Item } from './supabase';
import { classify } from './claude';
import { embed } from './embeddings';

/**
 * Classify + embed + insert a raw capture. The one capture path, shared by the capture API
 * and the PWA share target. Embedding is best-effort (attached after insert) so a pending
 * migration or embed failure never blocks the capture. Returns the saved item, or null on
 * empty input or a failed insert.
 */
export async function captureItem(rawInput: string): Promise<Item | null> {
  const text = rawInput.trim();
  if (!text) return null;

  const [classification, embedding] = await Promise.all([classify(text), embed(text, 'document')]);

  const { data, error } = await getSupabase()
    .from('items')
    .insert({
      raw_input: text,
      type: classification.type,
      title: classification.title,
      metadata: classification.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('captureItem insert error:', error);
    return null;
  }

  if (embedding) {
    const { error: embedErr } = await getSupabase().from('items').update({ embedding }).eq('id', data.id);
    if (embedErr) console.error('Embedding update failed (migration pending?):', embedErr.message);
  }

  return data as Item;
}
