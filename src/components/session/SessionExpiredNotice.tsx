'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ssoUrl } from '@/lib/sso';

/**
 * A 401 from this app's own BFF means the session token it holds is no longer good —
 * on 2026-10-16 every refreshed session lived ten minutes (tec-core-backend #429), and
 * every screen here went silently empty. This app cannot renew a Hub-entered session by
 * itself: the Hub hands over an access token, not a refresh token, and a Pi sign-in is
 * refused in the Hub's foreign session (ADR-007). So it SAYS so, and offers the one way
 * back that works: the Hub's SSO hand-off, which issues a fresh token to this app.
 *
 * Watches fetch rather than every call site: one place, so a new screen cannot forget.
 * Only same-origin /api/bff/* answers count — never /api/auth/*, which answer 401 for a
 * visitor who simply is not signed in yet.
 */
export const isSessionExpiry = (url: string, status: number, origin: string): boolean => {
  if (status !== 401) return false;
  // A path ("/api/bff/…") is this origin by definition — the screens call it that way.
  if (url.startsWith('/') && !url.startsWith('//')) return url.startsWith('/api/bff/');
  try {
    const u = new URL(url);
    return u.origin === origin && u.pathname.startsWith('/api/bff/');
  } catch { return false; }
};

export function SessionExpiredNotice() {
  const { t } = useTranslation();
  const [expired, setExpired] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const res = await original(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (isSessionExpiry(url, res.status, window.location.origin)) setExpired(true);
      return res;
    };
    return () => { window.fetch = original; };
  }, []);

  if (!expired || dismissed) return null;
  return (
    <div role="alert" style={{
      position: 'fixed', insetInline: 12, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 1000,
      background: '#0B1020', border: '1px solid #FBB44A55', borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.45)', color: '#E5E7EB',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#FBB44A' }}>{t.session.expiredTitle}</div>
      <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>{t.session.expiredBody}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={() => { window.location.href = ssoUrl(); }}
          style={{ flex: 1, background: '#FBB44A', color: '#050816', border: 'none', borderRadius: 10, padding: '10px 12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {t.session.reopen}
        </button>
        <button type="button" onClick={() => setDismissed(true)}
          style={{ background: 'transparent', color: '#9CA3AF', border: '1px solid #374151', borderRadius: 10, padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}>
          {t.session.dismiss}
        </button>
      </div>
    </div>
  );
}
