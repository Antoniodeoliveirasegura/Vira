import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { classify } from '@/lib/claude';
import { embed } from '@/lib/embeddings';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawInput: string = (body.rawInput ?? '').trim();

  if (!rawInput) {
    return NextResponse.json({ error: 'Input is required' }, { status: 400 });
  }

  // Classify and embed in parallel — the embedding is what makes the item semantically searchable.
  const [classification, embedding] = await Promise.all([
    classify(rawInput),
    embed(rawInput, 'document'),
  ]);

  const { data, error } = await getSupabase()
    .from('items')
    .insert({
      raw_input: rawInput,
      type: classification.type,
      title: classification.title,
      metadata: classification.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }

  // Best-effort: attach the embedding after insert so a pending migration or an embed
  // failure never breaks capture itself.
  if (embedding) {
    const { error: embedErr } = await getSupabase()
      .from('items')
      .update({ embedding })
      .eq('id', data.id);
    if (embedErr) console.error('Embedding update failed (migration pending?):', embedErr.message);
  }

  return NextResponse.json(data);
}
