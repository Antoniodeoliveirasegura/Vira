import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, expectedAuthToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password: string = body.password ?? '';

  if (!verifyPassword(password)) {
    // Small delay so a wrong answer doesn't return instantly (mild throttle)
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const token = await expectedAuthToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
