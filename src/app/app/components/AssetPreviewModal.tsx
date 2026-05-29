'use client';

import { useRef, useState }   from 'react';
import { Asset }              from '../types';
import { NFTTraits }          from './NFTTraits';
import { SimilarAssets }      from './SimilarAssets';
import { MintAsNftButton }    from './MintAsNftButton';

const assetColors: Record<string, { border: string; status: string }> = {
  nft:           { border: '#7b6bc840', status: '#b39ddb' },
  domain:        { border: '#7eb8f740', status: '#7eb8f7' },
  token:         { border: '#d4af3740', status: '#d4af37' },
  badge:         { border: '#7ee7c040', status: '#7ee7c0' },
  digital_asset: { border: '#d4af3720', status: '#6b6b7a' },
  default:       { border: '#d4af3720', status: '#6b6b7a' },
};

const getCsrf = (): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)tec_csrf=([^;]*)/);
  return match ? match[1] : '';
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

export function AssetPreviewModal({
  asset, assetName, nftImageUrl, showValues,
  onClose, onListForSale, onCancelListing, onExpandImage,
  allAssets = [], onRefresh,
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
  onRefresh?:      () => void;
}) {
  const colors    = assetColors[asset.asset_type] ?? assetColors.default;
  const metadata  = (asset.metadata ?? {}) as Record<string, unknown>;
  const hasTraits = Object.keys(metadata).some(k => !['imageUrl', 'piPaymentId', 'name'].includes(k));
  const isDomain  = asset.asset_type === 'domain';

  const startY            = useRef<number | null>(null);
  const [dragY,           setDragY]           = useState(0);
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 120) onClose();
    setDragY(0);
    startY.current = null;
  };

  // ✅ حذف الـ NFT نهائياً
  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000); // reset بعد 4 ثواني
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(
        `/api/bff/assets/delete?assetId=${asset.id}`,
        {
          method:      'DELETE',
          credentials: 'include',
          headers:     { 'x-csrf-token': getCsrf() },
        },
      );
      if (res.ok) {
        navigator.vibrate?.(50);
        onClose();
        setTimeout(() => onRefresh?.(), 2000);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setDeleteError(data.error ?? 'Delete failed');
        setConfirmDelete(false);
      }
    } catch {
      setDeleteError('Network error — try again');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
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
        {/* ── Handle ── */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: '#ffffff30', margin: '0 auto 16px',
          }} />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
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
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px',
                color: '#6b6b7a', fontSize: 16, cursor: 'pointer', flexShrink: 0,
              }}
            >
              🔗
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Status',  value: asset.status === 'on_sale' ? 'ON SALE' : asset.status.toUpperCase() },
              { label: 'Value',   value: showValues ? `${asset.value}π` : '****' },
              { label: 'Created', value: new Date(asset.created_at).toLocaleDateString() },
              { label: 'Price',   value: asset.listing_price ? `${asset.listing_price}π` : '—' },
            ].map(info => (
              <div key={info.label} style={{
                background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)',
                borderRadius: 12, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{info.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{info.value}</div>
              </div>
            ))}
          </div>

          {hasTraits && <NFTTraits metadata={metadata} colors={colors} />}
          {allAssets.length > 1 && <SimilarAssets asset={asset} allAssets={allAssets} colors={colors} />}
        </div>

        {/* ── Sticky Actions ── */}
        <div style={{
          flexShrink: 0,
          padding: '16px 20px 36px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,13,20,0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Error message */}
          {deleteError && (
            <div style={{ fontSize: 12, color: '#e74c3c', textAlign: 'center' }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {isDomain && asset.status === 'active' && (
              <MintAsNftButton
                asset={asset}
                onClose={onClose}
                onSuccess={() => onRefresh?.()}
              />
            )}

            {!isDomain && asset.status === 'active' && (
              <button
                onClick={() => { navigator.vibrate?.(10); onClose(); onListForSale(asset); }}
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
                onClick={() => { navigator.vibrate?.(10); onClose(); onCancelListing(asset.listing_id!); }}
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

          {/* ✅ Delete button — NFT فقط — مش on_sale */}
          {!isDomain && asset.status !== 'on_sale' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                width: '100%', padding: '14px',
                background: confirmDelete
                  ? 'rgba(231,76,60,0.2)'
                  : 'rgba(255,255,255,0.03)',
                border: confirmDelete
                  ? '1px solid rgba(231,76,60,0.6)'
                  : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                color: confirmDelete ? '#e74c3c' : '#3a3a4a',
                fontSize: 13, fontWeight: confirmDelete ? 700 : 400,
                cursor: deleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {deleting
                ? 'Deleting...'
                : confirmDelete
                  ? '⚠️ Tap again to confirm delete'
                  : '🗑️ Delete NFT'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
                }
