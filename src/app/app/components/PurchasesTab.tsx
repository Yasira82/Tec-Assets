'use client';

import { Purchase } from '../types';

const PurchaseCard = ({ p }: { p: Purchase & { isMint?: boolean } }) => (
  <div style={{
    background: '#0d0d14',
    border: `1px solid ${p.isMint ? '#7b6bc840' : '#7ee7c020'}`,
    borderRadius: 18, padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 14,
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 14,
      background: p.isMint
        ? 'linear-gradient(135deg,#2d1b69,#1a0f3d)'
        : 'linear-gradient(135deg,#0d2e14,#0a1f0f)',
      border: `1px solid ${p.isMint ? '#7b6bc830' : '#7ee7c030'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 24, flexShrink: 0, overflow: 'hidden',
    }}>
      {p.asset.metadata?.imageUrl ? (
        <img src={p.asset.metadata.imageUrl as string} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        p.asset.category.toLowerCase() === 'nft' ? '🎨' : '🌐'
      )}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {(p.asset.metadata?.name as string) ?? p.asset.slug}
      </div>
      <div style={{
        display: 'inline-block', fontSize: 9, fontWeight: 700,
        letterSpacing: 1.5,
        color:      p.isMint ? '#b39ddb' : '#7ee7c0',
        background: p.isMint ? '#b39ddb10' : '#7ee7c010',
        borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase',
      }}>
        {p.isMint ? '🎨 Minted' : '🛒 Purchased'}
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div style={{
        fontSize: 18, fontWeight: 900,
        color: p.isMint ? '#b39ddb' : '#7ee7c0',
      }}>
        {p.price}π
      </div>
      <div style={{ fontSize: 10, color: '#4a4a5a' }}>
        {p.soldAt ? new Date(p.soldAt).toLocaleDateString() : '—'}
      </div>
    </div>
  </div>
);

export function PurchasesTab({
  purchases, onGoMarketplace,
}: {
  purchases:       Purchase[];
  onGoMarketplace: () => void;
}) {
  if (purchases.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
      <div style={{ fontSize: 15, color: '#4a4a5a' }}>No purchases yet</div>
      <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
        Browse the Marketplace to find assets
      </div>
      <button onClick={onGoMarketplace} style={{
        marginTop: 20, padding: '12px 24px',
        background: 'linear-gradient(135deg,#d4af37,#b8882a)',
        border: 'none', borderRadius: 14,
        color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>
        🛒 Marketplace
      </button>
    </div>
  );

  return <>{purchases.map(p => <PurchaseCard key={p.id} p={p} />)}</>;
}
