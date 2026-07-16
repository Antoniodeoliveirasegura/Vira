import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { embed } from '@/lib/embeddings';
import { answerFromMatches } from '@/lib/claude';

// On-demand: embed the query, pull the top matches, and have Claude synthesize a
// short grounded answer. Only called when the user explicitly asks for an answer,
// so the Claude cost is per-request, not per-search.
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ answer: '', results: [] });

  const queryEmbedding = await embed(q, 'query');
  if (!queryEmbedding) {
    return NextResponse.json(
      { error: 'Search unavailable — no embeddings key configured.' },
      { status: 503 },
    );
  }

  const { data, error } = await getSupabase().rpc('match_items', {
    query_embedding: queryEmbedding,
    match_count: 5,
  });
  if (error) {
    console.error('match_items error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  const results = data ?? [];
  const answer = await answerFromMatches(q, results);
  return NextResponse.json({ answer, results });
}
