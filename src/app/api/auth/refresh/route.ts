import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.API_GATEWAY_URL
             ?? process.env.API_GATEWAY_URL
             ?? 'https://api-gateway-production-6a68.up.railway.app';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('tec_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const res = await fetch(`${GATEWAY}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    }

    const data      = await res.json();
    const newToken  = data?.data?.accessToken ?? data?.accessToken ?? data?.token ?? null;
    if (!newToken) {
      return NextResponse.json({ error: 'No token returned' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('tec_access_token', newToken, {
      httpOnly: false,
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
