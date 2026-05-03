'use client';

import { Asset } from '../types';

export function SimilarAssets({ asset, allAssets, colors }: {
  asset:     Asset;
  allAssets: Asset[];
  colors:    { border: string; status: string };
}) {
  const similar = allAssets
    .filter(a => a.id !== asset.id && a.asset_type === asset.asset_type)
    .slice(0, 4);
  if (similar.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: '#4a4a5a', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>
        Similar Assets
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {similar.map(a => {
          const imgUrl = a.asset_type === 'nft' ? (a.metadata?.imageUrl as string | undefined) : undefined;
          const name   = a.asset_type === 'nft' && a.metadata?.name ? a.metadata.name as string : a.name;
          return (
            <div key={a.id} style={{
              flexShrink: 0, width: 90,
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${colors.border}`,
              borderRadius: 14, overflow: 'hidden',
            }}>
              <div style={{
                width: '100%', height: 70,
                background: 'linear-gradient(135deg,#1a0f3d,#0d0d14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, overflow: 'hidden',
              }}>
                {imgUrl ? (
                  <img src={imgUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '🎨'}
              </div>
              <div style={{ padding: '8px' }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {name}
                </div>
                {a.listing_price && (
                  <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 800, marginTop: 2 }}>
                    {a.listing_price}π
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
