import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.API_GATEWAY_URL ?? '';

export async function POST(req: NextRequest) {
  if (!GATEWAY) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 });
  }

  const refreshToken = req.cookies.get('tec_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const res = await fetch(`${GATEWAY}/api/auth/refresh`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    }

    const data     = await res.json();
    const newToken = data?.data?.accessToken ?? data?.accessToken ?? data?.token ?? null;
    if (!newToken) {
      return NextResponse.json({ error: 'No token returned' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    // A session is BOTH cookies, so a refresh renews both.
    //
    // This used to renew the token alone. `tec_user` kept the lifetime the
    // sign-in gave it, so a day later the name cookie expired while the token
    // was still being renewed — a half session: the page opened, and every
    // screen said "Not signed in" with no way to sign in again. The values are
    // re-issued exactly as they are, never invented: a cookie that has already
    // lapsed stays lapsed, and the page guard sends that visitor back through
    // SSO (P6).
    const sessionCookieOpts = {
      httpOnly: false,   // intentional: Pi Browser WebView reads via document.cookie
      secure:   true,
      sameSite: 'none',
      partitioned: true,
      maxAge:   60 * 60 * 24,
      domain:   '.tecosystem.app',
      path:     '/',
    } as const;
    response.cookies.set('tec_access_token', newToken, sessionCookieOpts);
    for (const name of ['tec_user', 'tec_csrf'] as const) {
      const value = req.cookies.get(name)?.value;
      if (value) response.cookies.set(name, value, sessionCookieOpts);
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Refresh error' }, { status: 500 });
  }
}
