import { NextRequest, NextResponse } from 'next/server';
import { captureItem } from '@/lib/capture';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawInput: string = (body.rawInput ?? '').trim();

  if (!rawInput) {
    return NextResponse.json({ error: 'Input is required' }, { status: 400 });
  }

  const item = await captureItem(rawInput);
  if (!item) {
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }

  return NextResponse.json(item);
}
