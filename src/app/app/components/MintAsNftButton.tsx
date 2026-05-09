'use client';

import { Asset } from '../types';

export function MintAsNftButton({ asset }: {
  asset:     Asset;
  onClose:   () => void;
  onSuccess: () => void;
}) {
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

  const handleMint = () => {
    navigator.vibrate?.(10);
    const params = new URLSearchParams({
      action:     'mint-domain',
      asset_id:   asset.id,
      name:       asset.name,
      tier,
      return_url: 'https://assets.tecosystem.app/app',
    });
    // ✅ hub.tecosystem.app عشان الـ cookies وPi SDK يشتغلوا صح
    window.location.href = `https://hub.tecosystem.app/mint?${params.toString()}`;
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
        style={{
          flex: 1, padding: '16px',
          background: 'linear-gradient(135deg,#1a0f3d,#0a2040)',
          border: '1px solid #7b6bc850',
          borderRadius: 16,
          color: '#b39ddb',
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        🎨 Mint as NFT — 0.1π
      </button>
    </div>
  );
}
