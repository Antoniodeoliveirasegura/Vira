import { NextRequest, NextResponse } from 'next/server';
import { getTodayEvents, NotConnectedError } from '@/lib/google';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: 'timeMin and timeMax required' }, { status: 400 });
  }

  try {
    const events = await getTodayEvents(timeMin, timeMax);
    return NextResponse.json({ connected: true, events });
  } catch (e) {
    if (e instanceof NotConnectedError) {
      return NextResponse.json({ connected: false, events: [] });
    }
    console.error('Calendar fetch error:', e);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
