import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES  = ['/app', '/dashboard', '/profile', '/settings'];
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CSRF_PROTECTED = [
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/bff/assets/',
  '/api/bff/marketplace/',
];

const CSRF_EXCLUDED = [
  '/api/bff/nft/upload',
  '/api/bff/nft/register',
  '/api/bff/marketplace/buy',
  '/api/bff/marketplace/cancel',
  '/api/bff/assets/delete',
  '/api/bff/marketplace/list',
  '/api/bff/marketplace/update-price',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method       = req.method.toUpperCase();

  // ── Auth guard ────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r));
  if (isProtected) {
    const token = req.cookies.get('tec_access_token')?.value;
    if (!token || token.trim() === '') {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── CSRF guard ────────────────────────────────────────
  if (!CSRF_SAFE_METHODS.has(method)) {
    const isExcluded      = CSRF_EXCLUDED.some(r => pathname.startsWith(r));
    const isCsrfProtected = !isExcluded && CSRF_PROTECTED.some(r => pathname.startsWith(r));

    if (isCsrfProtected) {
      const csrfCookie = req.cookies.get('tec_csrf')?.value;
      const csrfHeader = req.headers.get('x-csrf-token');
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return NextResponse.json(
          { error: 'Invalid CSRF token', code: 'CSRF_INVALID' },
          { status: 403 },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/app/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/bff/:path*',
  ],
};
