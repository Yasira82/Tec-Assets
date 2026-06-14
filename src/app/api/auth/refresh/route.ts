import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.API_GATEWAY_URL ?? '';

export async function POST(req: NextRequest) {
  if (!GATEWAY) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 });
  }

  const csrfCookie = req.cookies.get('tec_csrf')?.value;
  const csrfHeader = req.headers.get('x-csrf-token');
  if (!csrfCookie || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
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
        'x-internal-key': process.env.INTERNAL_SECRET ?? '',
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
    response.cookies.set('tec_access_token', newToken, {
      httpOnly: false,   // intentional: Pi Browser WebView reads via document.cookie
      secure:   true,
      sameSite: 'none',
      maxAge:   60 * 60 * 24,
      domain:   '.tecosystem.app',
      path:     '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Refresh error' }, { status: 500 });
  }
}
