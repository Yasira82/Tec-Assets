import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify }                 from 'jose';

const usedJtis = new Map<string, number>();

const isJtiUsed = (jti: string): boolean => {
  const now = Date.now();
  for (const [key, exp] of usedJtis) {
    if (now > exp) usedJtis.delete(key);
  }
  return usedJtis.has(jti);
};

const markJtiUsed = (jti: string): void => {
  usedJtis.set(jti, Date.now() + 5 * 60 * 1000);
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/', req.url));

  const secret = process.env.SSO_SECRET;
  if (!secret) return NextResponse.json({ error: 'sso_not_configured' }, { status: 503 });

  try {
    const encoded = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(
      decodeURIComponent(token),
      encoded,
      {
        algorithms: ['HS256'],
        issuer:     'tec.pi',
        audience:   'https://tec-assets.vercel.app',
      },
    );

    const jti = payload.jti;
    if (!jti) return NextResponse.json({ error: 'missing_jti' }, { status: 401 });

    if (isJtiUsed(jti)) return NextResponse.json({ error: 'replay_detected' }, { status: 401 });
    markJtiUsed(jti);

    const accessToken = payload.accessToken as string;
    const user        = payload.user as Record<string, unknown>;

    // ── Debug ─────────────────────────────────────────────
    console.log('[SSO] callback — userId:', payload.sub);
    console.log('[SSO] accessToken prefix:', accessToken?.substring(0, 20));
    console.log('[SSO] setting cookies...');

    const res = NextResponse.redirect(new URL('/app', req.url));

    res.cookies.set('tec_access_token', accessToken, {
      httpOnly: false,
      secure:   true,
      sameSite: 'none',
      path:     '/',
      maxAge:   60 * 60 * 24,
    });

    res.cookies.set('tec_user', encodeURIComponent(JSON.stringify(user)), {
      httpOnly: false,
      secure:   true,
      sameSite: 'none',
      path:     '/',
      maxAge:   60 * 60 * 24,
    });

    res.cookies.set('tec_csrf', crypto.randomUUID(), {
      httpOnly: false,
      secure:   true,
      sameSite: 'none',
      path:     '/',
      maxAge:   60 * 60 * 24,
    });

    console.log('[SSO] redirect → /app');
    return res;

  } catch (err) {
    console.error('[SSO] error:', (err as Error).message);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
