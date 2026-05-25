import { NextRequest, NextResponse } from 'next/server';
import { getTodayEvents, NotConnectedError } from '@/lib/google';
import { getSupabase } from '@/lib/supabase';
import { suggestDay } from '@/lib/claude';

// TODO: This endpoint wasn't in the Phase 2 file list but is necessary —
// keeps ANTHROPIC_API_KEY server-side instead of shipping it to the client.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');

  if (!timeMin || !timeMax) {
    return NextResponse.json({ suggestion: '' });
  }

  let events: Awaited<ReturnType<typeof getTodayEvents>> = [];
  try {
    events = await getTodayEvents(timeMin, timeMax);
  } catch (e) {
    if (!(e instanceof NotConnectedError)) console.error(e);
  }

  const { data: tasks } = await getSupabase()
    .from('items')
    .select('title')
    .eq('type', 'task')
    .eq('status', 'open');

  const suggestion = await suggestDay(events, tasks ?? []);
  return NextResponse.json({ suggestion });
}
