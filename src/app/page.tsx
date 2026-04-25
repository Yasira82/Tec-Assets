'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePiAuth } from '@/lib-client/hooks/usePiAuth';

const TEC_SSO_URL =
  'https://tec-app.vercel.app/api/auth/sso?target=' +
  encodeURIComponent('https://tec-assets.vercel.app');

export default function HomePage() {
  const { isAuthenticated, isLoading } = usePiAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace('/app');
      return;
    }

    // ✅ مش authenticated → SSO من tec.pi
    window.location.href = TEC_SSO_URL;
  }, [isLoading, isAuthenticated, router]);

  return (
    <div style={{
      minHeight:   '100vh',
      background:  '#020205',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      fontFamily:  '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ fontSize: 56, marginBottom: 20 }}>💎</div>

        {/* Name */}
        <div style={{
          fontSize:   22,
          fontWeight: 900,
          color:      '#d4af37',
          marginBottom: 6,
        }}>
          Assets
        </div>

        <div style={{
          fontSize:      9,
          color:         '#4a4a5a',
          letterSpacing: 3,
          marginBottom:  32,
        }}>
          TEC ECOSYSTEM
        </div>

        {/* Loading indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <div style={{
            width:        16,
            height:       16,
            borderRadius: '50%',
            border:       '2px solid #d4af3730',
            borderTop:    '2px solid #d4af37',
            animation:    'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 13, color: '#4a4a5a' }}>
            Connecting to TEC...
          </span>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
