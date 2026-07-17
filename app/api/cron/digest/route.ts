import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, Item } from '@/lib/supabase';
import { dueNow } from '@/lib/reminders';
import { resurfaceCandidates } from '@/lib/resurface';
import { renderDigest, sendDigest } from '@/lib/email';

// The delivery channel: a daily digest that makes reminders + resurfacing fire when the
// app is closed. Triggered by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`. Add `?preview=1` to see the email HTML without
// sending — handy for local testing and eyeballing the layout.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // ponytail: open when no secret is set (local dev); enforced the moment CRON_SECRET exists.
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabase().from('items').select('*').eq('status', 'open');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []) as Item[];
  const now = new Date();
  const due = dueNow(items, now);
  const resurface = resurfaceCandidates(items, now);

  if (new URL(req.url).searchParams.get('preview')) {
    return new NextResponse(renderDigest(due, resurface, now, process.env.APP_URL), {
      headers: { 'content-type': 'text/html' },
    });
  }

  if (!due.length && !resurface.length) {
    return NextResponse.json({ sent: false, reason: 'nothing to send' });
  }

  const sent = await sendDigest(due, resurface, now);

  // Mark surfaced items so tomorrow's digest rests them for the cooldown window and
  // doesn't spam the same notes daily. Only after a successful send.
  if (sent && resurface.length) {
    await getSupabase()
      .from('items')
      .update({ last_surfaced_at: now.toISOString() })
      .in(
        'id',
        resurface.map((i) => i.id),
      );
  }

  return NextResponse.json({ sent, due: due.length, resurface: resurface.length });
}
