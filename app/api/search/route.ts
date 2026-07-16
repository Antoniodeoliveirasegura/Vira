import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { embed } from '@/lib/embeddings';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const queryEmbedding = await embed(q, 'query');
  if (!queryEmbedding) {
    return NextResponse.json(
      { error: 'Search unavailable — no embeddings key configured.' },
      { status: 503 },
    );
  }

  const { data, error } = await getSupabase().rpc('match_items', {
    query_embedding: queryEmbedding,
    match_count: 10,
  });

  if (error) {
    console.error('match_items error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
