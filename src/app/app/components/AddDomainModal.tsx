'use client';

import { useState, useEffect } from 'react';

const TEC_PAY_URL = 'https://tec-app-frontend.vercel.app/pay';

export function AddDomainModal({ onClose }: { onClose: () => void }) {
  const [slug,         setSlug]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [checking,     setChecking]     = useState(false);
  const [availability, setAvailability] = useState<'unknown' | 'available' | 'taken'>('unknown');

  const getRegistrationFee = (name: string): number => {
    const len = name.replace('.pi', '').length;
    if (len <= 3) return 5;
    if (len <= 5) return 3;
    if (len <= 9) return 2;
    return 1;
  };

  useEffect(() => {
    if (!slug || slug.length < 2) { setAvailability('unknown'); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res  = await fetch(`/api/bff/domains/check?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setAvailability(data.available ? 'available' : 'taken');
      } catch {
        setAvailability('unknown');
      } finally {
        setChecking(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [slug]);

  const handlePay = () => {
    const domain = slug.toLowerCase().trim();
    if (!domain)                  { setError('Enter a domain name'); return; }
    if (availability === 'taken') { setError('Domain already taken'); return; }
    setLoading(true);
    const fullDomain = domain.endsWith('.pi') ? domain : `${domain}.pi`;
    const fee        = getRegistrationFee(fullDomain);
    const params = new URLSearchParams({
      asset_type: 'domain', name: fullDomain,
      price:      fee.toString(),
      listing_id: `domain-reg-${Date.now()}`,
      asset_id:   `domain-${Date.now()}`,
      return_url: 'https://tec-assets-app.vercel.app/app',
    });
    window.location.href = `${TEC_PAY_URL}?${params.toString()}`;
  };

  const isDisabled = loading || !slug || availability === 'taken' || checking;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: '#0B1020', borderTop: '1px solid #7eb8f720', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🌐</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 }}>Add Your Domain</div>
        <div style={{ fontSize: 12, color: '#4a4a5a', textAlign: 'center', marginBottom: 24 }}>Register your Pi Network domain in TEC Assets</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>DOMAIN NAME</div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#0a0a12', border: `1px solid ${availability === 'available' ? '#7ee7c040' : availability === 'taken' ? '#e74c3c40' : '#7eb8f740'}`, borderRadius: 14, padding: '12px 16px', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌐</span>
            <input
              type="text" value={slug}
              onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
              placeholder="myname" autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontWeight: 700 }}
            />
            <span style={{ fontSize: 14, color: '#7eb8f7', fontWeight: 700 }}>.pi</span>
          </div>
          {slug && (
            <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center', color: checking ? '#6b6b7a' : availability === 'available' ? '#7ee7c0' : availability === 'taken' ? '#e74c3c' : '#7eb8f7' }}>
              {checking ? `⏳ Checking ${slug}.pi...` : availability === 'available' ? `✅ ${slug}.pi is available!` : availability === 'taken' ? `❌ ${slug}.pi is already taken` : `${slug}.pi`}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', background: '#ffffff05', borderRadius: 12, border: '1px solid #ffffff08', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b6b7a' }}>Registration Fee</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FBBF24' }}>{getRegistrationFee(slug || '')}π</span>
          </div>
          <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 4 }}>
            {slug.length <= 3 && slug ? '1-3 chars — premium' : slug.length <= 5 && slug ? '4-5 chars' : slug.length <= 9 && slug ? '6-9 chars' : slug ? '10+ chars' : 'Enter domain name'}
          </div>
        </div>

        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

        <button onClick={handlePay} disabled={isDisabled} style={{
          width: '100%', padding: '16px',
          background: isDisabled ? '#ffffff10' : availability === 'available' ? 'linear-gradient(135deg,#0d3320,#0a2218)' : 'linear-gradient(135deg,#1a3a5c,#0a2040)',
          border: isDisabled ? 'none' : availability === 'available' ? '1px solid #7ee7c040' : '1px solid #7eb8f740',
          borderRadius: 16,
          color: isDisabled ? '#4a4a5a' : availability === 'available' ? '#7ee7c0' : '#7eb8f7',
          fontSize: 15, fontWeight: 800, cursor: isDisabled ? 'default' : 'pointer',
        }}>
          {loading ? 'Processing...' : checking ? 'Checking...' : availability === 'taken' ? '❌ Domain Already Taken' : availability === 'available' ? `✅ Register ${slug}.pi for ${getRegistrationFee(slug)}π` : `Register ${slug ? slug + '.pi' : ''} for ${getRegistrationFee(slug || '')}π`}
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '14px', marginTop: 10, background: 'none', border: '1px solid #ffffff10', borderRadius: 16, color: '#4a4a5a', fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </>
  );
                                                                                                                  }
