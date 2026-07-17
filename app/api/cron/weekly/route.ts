import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, Item } from '@/lib/supabase';
import { weeklyReview } from '@/lib/claude';
import { dueLabel } from '@/lib/reminders';
import { renderWeekly, sendWeekly } from '@/lib/email';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Weekly review: Claude summarizes the past week's captures + the current open pile into a
// short actionable digest, emailed via the same channel as the daily digest. Same auth model
// as /api/cron/digest — exempt from the login gate (middleware), guarded by CRON_SECRET.
// Read-only. `?preview=1` renders the review as HTML without sending (makes one Claude call).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabase()
    .from('items')
    .select('*')
    .neq('status', 'archived'); // ponytail: pulls all non-archived rows; add a created_at floor if the table grows
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []) as Item[];
  const now = new Date();
  const cutoff = now.getTime() - WEEK_MS;

  const captured = items
    .filter((i) => new Date(i.created_at).getTime() >= cutoff)
    .map((i) => ({ title: i.title, type: i.type }));

  const open = items
    .filter((i) => i.status === 'open')
    .map((i) => ({ title: i.title, type: i.type, due: dueLabel(i, now) }));

  const review = await weeklyReview(captured, open);

  if (new URL(req.url).searchParams.get('preview')) {
    return new NextResponse(renderWeekly(review || '(nothing to review this week)', now, process.env.APP_URL), {
      headers: { 'content-type': 'text/html' },
    });
  }

  if (!review) return NextResponse.json({ sent: false, reason: 'nothing to review' });

  const sent = await sendWeekly(review, now);
  return NextResponse.json({ sent, captured: captured.length, open: open.length });
}
