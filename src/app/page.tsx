'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HUB_URL    = 'https://hub.tecosystem.app';
const ASSETS_URL = 'https://assets.tecosystem.app';
const SSO_URL    = `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(ASSETS_URL)}`;

const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('tec_access_token='));
  return match ? match.split('=')[1] : null;
};

export default function HomePage() {
  // Fire-and-forget backend warmup (Railway cold starts — see /api/warmup).
  useEffect(() => { fetch('/api/warmup').catch(() => {}); }, []);

  const router = useRouter();

  useEffect(() => {
    const token = getTokenFromCookie();
    if (token) {
      router.replace('/app');
    } else {
      window.location.href = SSO_URL;
    }
  }, [router]);

  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#050816',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontFamily:     '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>💎</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#FBBF24', marginBottom: 6 }}>
          Assets
        </div>
        <div style={{ fontSize: 9, color: '#4a4a5a', letterSpacing: 3, marginBottom: 32 }}>
          TEC ECOSYSTEM
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid #FBBF2430', borderTop: '2px solid #FBBF24',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 13, color: '#4a4a5a' }}>Connecting to TEC...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
