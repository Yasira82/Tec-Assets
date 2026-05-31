'use client';

import { useState }         from 'react';
import { createU2APayment } from '@/lib-client/pi/pi-payment';

const HUB_URL    = process.env.NEXT_PUBLIC_HUB_URL    ?? 'https://hub.tecosystem.app';
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? 'https://assets.tecosystem.app';
const MINT_FEE   = 1;

const getCsrf = (): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)tec_csrf=([^;]*)/);
  return match ? match[1] : '';
};

export function MintAsNftButton({
  asset, onClose, onSuccess,
}: {
  asset:     { id: string; name: string };
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const domainName = asset.name.replace('.pi', '').replace(/\./g, '');
  const tier = domainName.length <= 2 ? 'Legendary'
             : domainName.length <= 3 ? 'Ultra Rare'
             : domainName.length <= 5 ? 'Rare'
             : domainName.length <= 9 ? 'Uncommon'
             : 'Common';

  const tierColor = tier === 'Legendary'  ? '#ffd700'
                  : tier === 'Ultra Rare' ? '#b39ddb'
                  : tier === 'Rare'       ? '#7eb8f7'
                  : tier === 'Uncommon'   ? '#7ee7c0'
                  : '#d4af37';

  const handleMint = async () => {
    setLoading(true);
    setError('');
    navigator.vibrate?.(10);

    // ✅ تحقق من auth وقت الدفع
    if (!(window as any).__TEC_PI_AUTHENTICATED) {
      try {
        await window.Pi.authenticate(['username', 'payments'], () => {});
        (window as any).__TEC_PI_AUTHENTICATED = true;
      } catch {
        const params = new URLSearchParams({
          amount:     MINT_FEE.toString(),
          memo:       `Mint Domain as NFT: ${asset.name}`,
          product_id: `domain-nft:${asset.id}:${encodeURIComponent(asset.name)}`,
          return_url: `${ASSETS_URL}/app`,
          source:     'assets',
        });
        window.location.href = `${HUB_URL}/hub/pay?${params.toString()}`;
        return;
      }
    }

    // ── Mode 2: Direct payment ──
    try {
      const result = await createU2APayment(
        MINT_FEE,
        `Mint Domain as NFT: ${asset.name}`,
        { source: 'assets', type: 'domain_nft', asset_id: asset.id },
      );

      if (!result.success) {
        setError(result.status === 'cancelled' ? 'Cancelled' : result.message ?? 'Payment failed');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/bff/assets/mint-as-nft', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({
          asset_id:      asset.id,
          transactionId: result.paymentId ?? '',
        }),
      });

      if (res.ok || res.status === 409) {
        onSuccess();
        onClose();
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? 'Minting failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '6px 12px',
        background: `${tierColor}10`,
        border: `1px solid ${tierColor}30`,
        borderRadius: 10,
      }}>
        <span style={{ fontSize: 10, color: tierColor, fontWeight: 700, letterSpacing: 1 }}>
          ✦ {tier.toUpperCase()} DOMAIN
        </span>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#e74c3c', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={loading}
        style={{
          flex: 1, padding: '16px',
          background: loading ? '#ffffff10' : 'linear-gradient(135deg,#1a0f3d,#0a2040)',
          border: '1px solid #7b6bc850', borderRadius: 16,
          color: loading ? '#4a4a5a' : '#b39ddb',
          fontSize: 15, fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? 'Processing...' : `🎨 Mint as NFT — ${MINT_FEE}π`}
      </button>
    </div>
  );
}
