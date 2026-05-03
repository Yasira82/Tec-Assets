'use client';

import { useState } from 'react';
import { Asset }    from '../types';

const waitForPiSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('Not in browser')); return; }
    if (window.__TEC_PI_READY && typeof window.Pi !== 'undefined') { resolve(); return; }
    const timer = setTimeout(() => {
      window.removeEventListener('tec-pi-ready', onReady);
      window.removeEventListener('tec-pi-error', onError);
      reject(new Error('Pi SDK timeout'));
    }, 10000);
    const onReady = () => { clearTimeout(timer); resolve(); };
    const onError = () => { clearTimeout(timer); reject(new Error('Pi SDK failed to load')); };
    window.addEventListener('tec-pi-ready', onReady, { once: true });
    window.addEventListener('tec-pi-error', onError, { once: true });
  });
};

export function MintAsNftButton({ asset, onClose, onSuccess }: {
  asset:     Asset;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [minting, setMinting] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

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
  setMinting(true);
  setError(null);
  navigator.vibrate?.(10);

  try {
    if (!window.Pi) { setError('Open in Pi Browser'); setMinting(false); return; }

    // ✅ Init مباشرة قبل أي method
    try {
      window.Pi.init({
        version: '2.0',
        sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === 'true',
        appId:   process.env.NEXT_PUBLIC_PI_APP_ID ?? '',
      });
    } catch { /* already initialized — ok */ }

    // ✅ Authenticate
    await window.Pi.authenticate(['username', 'payments'], () => {});

    await new Promise<void>((resolve, reject) => {
      window.Pi.createPayment(
        {
          amount:   0.1,
          memo:     `Mint ${asset.name} as NFT`,
          metadata: { assetId: asset.id, type: 'domain_mint' },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              await fetch('/api/payment/approve', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId }),
              });
            } catch { reject(new Error('Approval failed')); }
          },
          onReadyForServerCompletion: async (_paymentId: string, txid: string) => {
            try {
              const res = await fetch('/api/bff/assets/mint-as-nft', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assetId:       asset.id,
                  transactionId: txid,
                  userId:        asset.owner_id ?? '',
                }),
              });
              if (!res.ok) throw new Error('Mint failed');
              resolve();
            } catch (e) { reject(e); }
          },
          onCancel: () => reject(new Error('Cancelled')),
          onError:  (e: unknown) => reject(e),
        }
      );
    });

    onSuccess();
    onClose();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Mint failed';
    if (msg !== 'Cancelled') setError(msg);
  } finally {
    setMinting(false);
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

      <button
        onClick={handleMint}
        disabled={minting}
        style={{
          flex: 1, padding: '16px',
          background: minting
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(135deg,#1a0f3d,#0a2040)',
          border: `1px solid ${minting ? 'rgba(255,255,255,0.1)' : '#7b6bc850'}`,
          borderRadius: 16,
          color: minting ? '#4a4a5a' : '#b39ddb',
          fontSize: 15, fontWeight: 800,
          cursor: minting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        {minting ? (
          <>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid #4a4a5a',
              borderTopColor: '#b39ddb',
              animation: 'spin 0.8s linear infinite',
              display: 'inline-block',
            }} />
            Minting...
          </>
        ) : (
          '🎨 Mint as NFT — 0.1π'
        )}
      </button>

      {error && (
        <div style={{
          fontSize: 11, color: '#e74c3c', textAlign: 'center',
          padding: '6px', background: 'rgba(231,76,60,0.08)',
          borderRadius: 8,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
