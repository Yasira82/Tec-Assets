'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePiAuth } from '@/lib-client/hooks/usePiAuth';

export default function HomePage() {
  const { isAuthenticated, isLoading, login, error } = usePiAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/app');
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div style={{
      minHeight: '100vh', background: '#020205',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>💎</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#d4af37', marginBottom: 4 }}>
          Assets
        </div>
        <div style={{ fontSize: 13, color: '#4a4a5a', marginBottom: 8, letterSpacing: 2 }}>
          TEC ECOSYSTEM
        </div>
        <div style={{ fontSize: 13, color: '#6b6b7a', marginBottom: 40, maxWidth: 280, margin: '0 auto 40px' }}>
          Manage your Pi Network digital assets — domains, NFTs, portfolio
        </div>

        {error && (
          <div style={{
            background: '#1a0505', border: '1px solid #e74c3c40',
            borderRadius: 12, padding: '12px 20px', marginBottom: 20,
            color: '#e74c3c', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={login}
          disabled={isLoading}
          style={{
            padding: '16px 40px',
            background: isLoading ? '#ffffff10' : 'linear-gradient(135deg,#d4af37,#b8882a)',
            border: 'none', borderRadius: 18,
            color: isLoading ? '#6b6b7a' : '#0a0800',
            fontSize: 15, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}>
          {isLoading ? 'Connecting...' : 'Login with Pi'}
        </button>

        <div style={{ marginTop: 16, fontSize: 11, color: '#4a4a5a' }}>
          Open in Pi Browser for full experience
        </div>
      </div>
    </div>
  );
}
