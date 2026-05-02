'use client';

import { useState } from 'react';
import { Asset }    from '../types';

const typeEmoji: Record<string, string> = {
  domain:        '🌐',
  nft:           '🎨',
  token:         '🪙',
  badge:         '🏆',
  digital_asset: '💎',
  default:       '💎',
};

// ── NFT color system
const assetColors: Record<string, { border: string; bg: string; status: string }> = {
  nft:           { border: '#7b6bc840', bg: 'linear-gradient(135deg,#1a0f3d,#0d0d14)', status: '#b39ddb' },
  domain:        { border: '#7eb8f740', bg: 'linear-gradient(135deg,#0a2040,#0d0d14)', status: '#7eb8f7' },
  token:         { border: '#d4af3740', bg: 'linear-gradient(135deg,#1a1208,#0d0d14)', status: '#d4af37' },
  badge:         { border: '#7ee7c040', bg: 'linear-gradient(135deg,#0d2e14,#0d0d14)', status: '#7ee7c0' },
  digital_asset: { border: '#d4af3720', bg: 'linear-gradient(135deg,#0d0d14,#0d0d14)', status: '#6b6b7a' },
  default:       { border: '#d4af3720', bg: 'linear-gradient(135deg,#0d0d14,#0d0d14)', status: '#6b6b7a' },
};

export function AssetCard({
  asset,
  showValues,
  onListForSale,
  onCancelListing,
}: {
  asset:           Asset;
  showValues:      boolean;
  onListForSale:   (asset: Asset) => void;
  onCancelListing: (listingId: string) => void;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const nftImageUrl = asset.asset_type === 'nft'
    ? (asset.metadata?.imageUrl as string | undefined)
    : undefined;

  const colors = assetColors[asset.asset_type] ?? assetColors.default;

  return (
    <>
      {/* ── Image Viewer ── */}
      {viewerOpen && nftImageUrl && (
        <div
          onClick={() => setViewerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <img
            src={nftImageUrl}
            alt={asset.name}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 16,
              border: '1px solid #ffffff20',
            }}
          />
          <button
            onClick={() => setViewerOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: '#ffffff15', border: '1px solid #ffffff20',
              borderRadius: '50%', width: 40, height: 40,
              color: '#fff', fontSize: 18, cursor: 'pointer',
            }}
          >
            ✕
          </button>
          <div style={{
            position: 'absolute', bottom: 30,
            fontSize: 12, color: '#ffffff60',
          }}>
            Tap anywhere to close
          </div>
        </div>
      )}

      <div style={{
        background: '#0d0d14',
        border: `1px solid ${colors.border}`,
        borderRadius: 18, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* ── Asset Image/Icon ── */}
        <div
          onClick={() => nftImageUrl && setViewerOpen(true)}
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0, overflow: 'hidden',
            cursor: nftImageUrl ? 'zoom-in' : 'default',
            position: 'relative',
          }}
        >
          {nftImageUrl ? (
            <>
              <img
                src={nftImageUrl}
                alt={asset.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* ✅ Zoom hint */}
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                fontSize: 8, background: '#00000060',
                borderRadius: 4, padding: '1px 3px', color: '#fff',
              }}>
                🔍
              </div>
            </>
          ) : (
            typeEmoji[asset.asset_type] ?? typeEmoji.default
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {asset.asset_type === 'nft' && asset.metadata?.name
              ? asset.metadata.name as string
              : asset.name}
          </div>
          {/* ✅ Asset type badge */}
          <div style={{
            display: 'inline-block',
            fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
            color: colors.status,
            background: `${colors.border}`,
            borderRadius: 6, padding: '2px 6px',
            textTransform: 'uppercase',
          }}>
            {asset.asset_type}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            color: asset.status === 'active'  ? '#7ee7c0'
                 : asset.status === 'on_sale' ? '#d4af37'
                 : '#6b6b7a',
          }}>
            {asset.status === 'on_sale' ? 'ON SALE' : asset.status.toUpperCase()}
          </div>

          {asset.status === 'active' && (
            <button onClick={() => onListForSale(asset)} style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#d4af3715', border: '1px solid #d4af3740',
              color: '#d4af37', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              List for Sale
            </button>
          )}

          {asset.status === 'on_sale' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <div style={{
                padding: '4px 10px', borderRadius: 10,
                background: '#d4af3720', border: '1px solid #d4af3740',
                color: '#d4af37', fontSize: 10, fontWeight: 700,
              }}>
                🏷️ {asset.listing_price}π
              </div>
              {asset.listing_id && (
                <button onClick={() => onCancelListing(asset.listing_id!)} style={{
                  padding: '4px 10px', borderRadius: 10,
                  background: '#e74c3c15', border: '1px solid #e74c3c40',
                  color: '#e74c3c', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
