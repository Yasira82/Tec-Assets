'use client';

import { useRef, useState } from 'react';
import { Asset } from '../types';

const assetColors: Record<string, { border: string; status: string }> = {
  nft:           { border: '#7b6bc840', status: '#b39ddb' },
  domain:        { border: '#7eb8f740', status: '#7eb8f7' },
  token:         { border: '#d4af3740', status: '#d4af37' },
  badge:         { border: '#7ee7c040', status: '#7ee7c0' },
  digital_asset: { border: '#d4af3720', status: '#6b6b7a' },
  default:       { border: '#d4af3720', status: '#6b6b7a' },
};

const handleShare = async (assetName: string, price?: number | null) => {
  const text = price
    ? `Check out "${assetName}" on TEC Assets — listed for ${price}π! 🎨`
    : `Check out "${assetName}" on TEC Assets! 🎨`;
  if (navigator.share) {
    await navigator.share({ title: assetName, text, url: window.location.href }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(`${text}\n${window.location.href}`).catch(() => {});
    alert('Link copied!');
  }
};

const NFTTraits = ({ metadata, colors }: {
  metadata: Record<string, unknown>;
  colors:   { border: string; status: string };
}) => {
  const traits = Object.entries(metadata).filter(([key]) =>
    !['imageUrl', 'piPaymentId', 'name'].includes(key)
  );
  if (traits.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: '#4a4a5a', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>
        Traits
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {traits.map(([key, value]) => (
          <div key={key} style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${colors.border}`,
            borderRadius: 10, padding: '8px 12px', minWidth: 80,
          }}>
            <div style={{ fontSize: 9, color: colors.status, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
              {key}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{String(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimilarAssets = ({ asset, allAssets, colors }: {
  asset:     Asset;
  allAssets: Asset[];
  colors:    { border: string; status: string };
}) => {
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
};

export function AssetPreviewModal({
  asset, assetName, nftImageUrl, showValues,
  onClose, onListForSale, onCancelListing, onExpandImage,
  allAssets = [],
}: {
  asset:           Asset;
  assetName:       string;
  nftImageUrl?:    string;
  showValues:      boolean;
  onClose:         () => void;
  onListForSale:   (asset: Asset) => void;
  onCancelListing: (listingId: string) => void;
  onExpandImage:   () => void;
  allAssets?:      Asset[];
}) {
  const colors    = assetColors[asset.asset_type] ?? assetColors.default;
  const metadata  = (asset.metadata ?? {}) as Record<string, unknown>;
  const hasTraits = Object.keys(metadata).some(k => !['imageUrl', 'piPaymentId', 'name'].includes(k));

  // ── Drag to dismiss ───────────────────────────────────
  const startY      = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 120) { onClose(); }
    setDragY(0);
    startY.current = null;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: `rgba(0,0,0,${Math.max(0.4, 0.85 - dragY / 400)})`,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        transition: dragY === 0 ? 'background 0.3s' : 'none',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: '100%', maxWidth: 480,
          background: 'rgba(13,13,20,0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform 0.3s ease' : 'none',
          animation: dragY === 0 ? 'slideUp 0.3s ease' : 'none',
        }}
      >
        {/* ── Handle — drag zone ── */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: '#ffffff30', margin: '0 auto 16px',
          }} />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>

          {/* ── Image ── */}
          {nftImageUrl && (
            <div
              onClick={onExpandImage}
              style={{
                width: '100%', height: 220, borderRadius: 16,
                overflow: 'hidden', marginBottom: 20, cursor: 'zoom-in',
                border: `1px solid ${colors.border}`, position: 'relative',
              }}
            >
              <img src={nftImageUrl} alt={assetName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                borderRadius: 8, padding: '4px 8px', fontSize: 11, color: '#fff',
              }}>
                🔍 Expand
              </div>
            </div>
          )}

          {/* ── Name + Badge + Share ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <div style={{
                fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {assetName}
              </div>
              <div style={{
                display: 'inline-block', fontSize: 10, fontWeight: 700,
                letterSpacing: 1.5, color: colors.status, background: colors.border,
                borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase',
              }}>
                {asset.asset_type}
              </div>
            </div>
            <button
              onClick={() => handleShare(assetName, asset.listing_price)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px',
                color: '#6b6b7a', fontSize: 16, cursor: 'pointer', flexShrink: 0,
              }}
            >
              🔗
            </button>
          </div>

          {/* ── Info Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Status',  value: asset.status === 'on_sale' ? 'ON SALE' : asset.status.toUpperCase() },
              { label: 'Value',   value: showValues ? `${asset.value}π` : '****' },
              { label: 'Created', value: new Date(asset.created_at).toLocaleDateString() },
              { label: 'Price',   value: asset.listing_price ? `${asset.listing_price}π` : '—' },
            ].map(info => (
              <div key={info.label} style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(10px)',
                borderRadius: 12, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{info.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{info.value}</div>
              </div>
            ))}
          </div>

          {/* ── NFT Traits ── */}
          {hasTraits && <NFTTraits metadata={metadata} colors={colors} />}

          {/* ── Similar Assets ── */}
          {allAssets.length > 1 && <SimilarAssets asset={asset} allAssets={allAssets} colors={colors} />}

        </div>

        {/* ── Sticky Actions ── */}
        <div style={{
          flexShrink: 0,
          padding: '16px 20px 36px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,13,20,0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex', gap: 10,
        }}>
          {asset.status === 'active' && (
            <button
              onClick={() => {
                navigator.vibrate?.(10);
                onClose();
                onListForSale(asset);
              }}
              style={{
                flex: 1, padding: '16px',
                background: 'linear-gradient(135deg,#d4af37,#b8882a)',
                border: 'none', borderRadius: 16,
                color: '#0a0800', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}
            >
              🏷️ List for Sale
            </button>
          )}

          {asset.status === 'on_sale' && asset.listing_id && (
            <button
              onClick={() => {
                navigator.vibrate?.(10);
                onClose();
                onCancelListing(asset.listing_id!);
              }}
              style={{
                flex: 1, padding: '16px',
                background: 'rgba(231,76,60,0.08)',
                border: '1px solid rgba(231,76,60,0.3)',
                borderRadius: 16, color: '#e74c3c',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Cancel Listing
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, color: '#6b6b7a',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
