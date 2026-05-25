import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { classify } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawInput: string = (body.rawInput ?? '').trim();

  if (!rawInput) {
    return NextResponse.json({ error: 'Input is required' }, { status: 400 });
  }

  const classification = await classify(rawInput);

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

  return NextResponse.json(data);
}
