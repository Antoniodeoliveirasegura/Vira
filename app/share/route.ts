import { NextRequest, NextResponse } from 'next/server';
import { captureItem } from '@/lib/capture';

// Web Share Target endpoint. Android's "Share → Vira" navigates here (GET) with the shared
// title/text/url as query params. We fold them into one capture, then redirect home — so a
// refresh doesn't re-capture, and the new item is visible at the top of the inbox.
//
// This route stays behind the auth gate (middleware): the installed PWA carries the login
// cookie, so only the signed-in owner can capture. classify() will pull a URL out of the
// text if the sharing app puts it there instead of the url field.
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const raw = [p.get('title'), p.get('text'), p.get('url')].filter(Boolean).join(' ').trim();

  if (raw) await captureItem(raw);

  return NextResponse.redirect(new URL('/?shared=1', req.url));
}
