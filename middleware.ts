import { NextRequest, NextResponse } from 'next/server';
import { isValidAuthCookie, COOKIE_NAME } from '@/lib/auth';

// Paths that must work without an auth cookie.
// /api/cron is reached by Vercel Cron with a Bearer token (not the login cookie); the
// cron route enforces its own CRON_SECRET, so it opts out of the cookie gate here.
// /manifest.webmanifest and /icons are fetched by the browser/OS without cookies during
// PWA install — they must be public or the app won't be installable. (/share stays gated.)
const PUBLIC_PATHS = ['/login', '/api/login', '/api/cron', '/manifest.webmanifest', '/icons'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await isValidAuthCookie(cookie);
  if (ok) return NextResponse.next();

  // API routes get a 401; pages get a redirect to /login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

// Run on everything except Next.js internals and static files.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
