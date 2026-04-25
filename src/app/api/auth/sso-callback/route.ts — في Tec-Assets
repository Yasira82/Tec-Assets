import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify }                 from 'jose';

// ── In-memory anti-replay (Edge-safe) ────────────────────
// لو عندك Redis — استخدمه بدل ده
const usedJtis = new Map<string, number>();

const isJtiUsed = (jti: string): boolean => {
  const now = Date.now();
  // نضّف الـ expired tokens
  for (const [key, exp] of usedJtis) {
    if (now > exp) usedJtis.delete(key);
  }
  return usedJtis.has(jti);
};

const markJtiUsed = (jti: string): void => {
  // 5 دقائق
  usedJtis.set(jti, Date.now() + 5 * 60 * 1000);
};

// ── Handler ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const secret = process.env.SSO_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'sso_not_configured' }, { status: 503 });
  }

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

    // ── Anti-replay ───────────────────────────────────────
    const jti = payload.jti;
    if (!jti) {
      return NextResponse.json({ error: 'missing_jti' }, { status: 401 });
    }

    if (isJtiUsed(jti)) {
      return NextResponse.json({ error: 'replay_detected' }, { status: 401 });
    }

    markJtiUsed(jti);

    // ── Set cookies ───────────────────────────────────────
    const accessToken = payload.accessToken as string;
    const user        = payload.user as Record<string, unknown>;

    const res = NextResponse.redirect(new URL('/app', req.url));

    // ✅ httpOnly:false — Pi Browser بيقرأ من document.cookie
    res.cookies.set('tec_access_token', accessToken, {
      httpOnly: false,
      secure:   true,
      sameSite: 'none',  // ✅ Pi Browser WebView
      path:     '/',
      maxAge:   60 * 60 * 24, // 24h
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

    return res;

  } catch {
    // Token expired أو invalid → رجّع للـ login
    return NextResponse.redirect(new URL('/', req.url));
  }
}
