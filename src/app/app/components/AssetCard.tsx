'use client';

import { useState } from 'react';
import { Asset }    from '../types';
import { AssetImageViewer }  from './AssetImageViewer';
import { AssetPreviewModal } from './AssetPreviewModal';

const typeEmoji: Record<string, string> = {
  domain: '🌐', nft: '🎨', token: '🪙', badge: '🏆',
  digital_asset: '💎', default: '💎',
};

const assetColors: Record<string, { border: string; bg: string; status: string }> = {
  nft:           { border: '#7b6bc840', bg: 'linear-gradient(135deg,#1a0f3d,#0d0d14)', status: '#b39ddb' },
  domain:        { border: '#7eb8f740', bg: 'linear-gradient(135deg,#0a2040,#0d0d14)', status: '#7eb8f7' },
  token:         { border: '#d4af3740', bg: 'linear-gradient(135deg,#1a1208,#0d0d14)', status: '#d4af37' },
  badge:         { border: '#7ee7c040', bg: 'linear-gradient(135deg,#0d2e14,#0d0d14)', status: '#7ee7c0' },
  digital_asset: { border: '#d4af3720', bg: 'linear-gradient(135deg,#0d0d14,#0d0d14)', status: '#6b6b7a' },
  default:       { border: '#d4af3720', bg: 'linear-gradient(135deg,#0d0d14,#0d0d14)', status: '#6b6b7a' },
};

export function AssetCard({
  asset, showValues, onListForSale, onCancelListing, allAssets = [],
}: {
  asset:           Asset;
  showValues:      boolean;
  onListForSale:   (asset: Asset) => void;
  onCancelListing: (listingId: string) => void;
  allAssets?:      Asset[];
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewerOpen,  setViewerOpen]  = useState(false);

  const nftImageUrl = asset.asset_type === 'nft'
    ? (asset.metadata?.imageUrl as string | undefined)
    : undefined;

  const assetName = asset.asset_type === 'nft' && asset.metadata?.name
    ? asset.metadata.name as string
    : asset.name;

  const colors = assetColors[asset.asset_type] ?? assetColors.default;

  return (
    <>
      {viewerOpen && nftImageUrl && (
        <AssetImageViewer
          imageUrl={nftImageUrl}
          altText={assetName}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {previewOpen && (
        <AssetPreviewModal
          asset={asset}
          assetName={assetName}
          nftImageUrl={nftImageUrl}
          showValues={showValues}
          onClose={() => setPreviewOpen(false)}
          onListForSale={onListForSale}
          onCancelListing={onCancelListing}
          onExpandImage={() => { setPreviewOpen(false); setViewerOpen(true); }}
          allAssets={allAssets}
        />
      )}

      <div
        onClick={() => setPreviewOpen(true)}
        onMouseEnter={e => {
          e.currentTarget.style.transform   = 'perspective(1000px) rotateY(2deg) translateY(-2px)';
          e.currentTarget.style.boxShadow   = `0 8px 30px ${colors.border}`;
          e.currentTarget.style.borderColor = colors.status;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform   = 'none';
          e.currentTarget.style.boxShadow   = 'none';
          e.currentTarget.style.borderColor = colors.border;
        }}
        onTouchStart={e => {
          e.currentTarget.style.transform   = 'scale(0.97)';
          e.currentTarget.style.boxShadow   = `0 4px 20px ${colors.border}`;
          e.currentTarget.style.borderColor = colors.status;
        }}
        onTouchEnd={e => {
          e.currentTarget.style.transform   = 'none';
          e.currentTarget.style.boxShadow   = 'none';
          e.currentTarget.style.borderColor = colors.border;
        }}
        style={{
          background: '#0d0d14',
          border: `1px solid ${colors.border}`,
          borderRadius: 18, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: colors.bg, border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0, overflow: 'hidden', position: 'relative',
        }}>
          {nftImageUrl ? (
            <>
              <img src={nftImageUrl} alt={assetName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                fontSize: 8, background: '#00000060',
                borderRadius: 4, padding: '1px 3px', color: '#fff',
              }}>🔍</div>
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
            {assetName}
          </div>
          <div style={{
            display: 'inline-block', fontSize: 9, fontWeight: 700,
            letterSpacing: 1.5, color: colors.status, background: colors.border,
            borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase',
          }}>
            {asset.asset_type}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            color: asset.status === 'active'  ? '#7ee7c0'
                 : asset.status === 'on_sale' ? '#d4af37'
                 : '#6b6b7a',
          }}>
            {asset.status === 'on_sale' ? 'ON SALE' : asset.status.toUpperCase()}
          </div>
          {asset.listing_price && (
            <div style={{ fontSize: 12, fontWeight: 800, color: '#d4af37' }}>
              {asset.listing_price}π
            </div>
          )}
          <div style={{ fontSize: 10, color: '#4a4a5a' }}>Tap to preview</div>
        </div>
      </div>
    </>
  );
}
