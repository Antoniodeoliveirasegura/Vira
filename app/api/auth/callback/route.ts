import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { storeRefreshToken } from '@/lib/google';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Code exchange failed:', error);
    return NextResponse.redirect(`${origin}/?error=exchange_failed`);
  }

  const refreshToken = data.session?.provider_refresh_token;
  if (!refreshToken) {
    return NextResponse.redirect(`${origin}/?error=no_refresh_token`);
  }

  try {
    await storeRefreshToken(refreshToken);
  } catch (e) {
    console.error('Failed to store refresh token:', e);
    return NextResponse.redirect(`${origin}/?error=store_failed`);
  }

  return NextResponse.redirect(`${origin}/?connected=1`);
}
