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
      {/* ── Fullscreen Image Viewer ── */}
      {viewerOpen && nftImageUrl && (
        <div
          onClick={() => setViewerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.98)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
          }}
        >
          <img
            src={nftImageUrl}
            alt={assetName}
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
          <div style={{ position: 'absolute', bottom: 30, fontSize: 12, color: '#ffffff60' }}>
            Tap anywhere to close
          </div>
        </div>
      )}

      {/* ── Quick Preview Modal ── */}
      {previewOpen && (
        <div
          onClick={() => setPreviewOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: '#0d0d14',
              border: `1px solid ${colors.border}`,
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 40px',
              animation: 'slideUp 0.3s ease',
            }}
          >
            {/* ── Handle ── */}
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: '#ffffff20', margin: '0 auto 20px',
            }} />

            {/* ── Image ── */}
            {nftImageUrl && (
              <div
                onClick={() => { setPreviewOpen(false); setViewerOpen(true); }}
                style={{
                  width: '100%', height: 220, borderRadius: 16,
                  overflow: 'hidden', marginBottom: 20, cursor: 'zoom-in',
                  border: `1px solid ${colors.border}`,
                  position: 'relative',
                }}
              >
                <img
                  src={nftImageUrl}
                  alt={assetName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', bottom: 8, right: 8,
                  background: '#00000080', borderRadius: 8,
                  padding: '4px 8px', fontSize: 11, color: '#fff',
                }}>
                  🔍 Tap to expand
                </div>
              </div>
            )}

            {/* ── Name + Badge ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                {assetName}
              </div>
              <div style={{
                display: 'inline-block',
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                color: colors.status, background: colors.border,
                borderRadius: 6, padding: '3px 8px',
                textTransform: 'uppercase',
              }}>
                {asset.asset_type}
              </div>
            </div>

            {/* ── Info Grid ── */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 10, marginBottom: 20,
            }}>
              {[
                { label: 'Status',  value: asset.status === 'on_sale' ? 'ON SALE' : asset.status.toUpperCase() },
                { label: 'Value',   value: showValues ? `${asset.value}π` : '****' },
                { label: 'Created', value: new Date(asset.created_at).toLocaleDateString() },
                { label: 'Price',   value: asset.listing_price ? `${asset.listing_price}π` : '—' },
              ].map(info => (
                <div key={info.label} style={{
                  background: '#ffffff05', borderRadius: 12, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{info.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{info.value}</div>
                </div>
              ))}
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 10 }}>
              {asset.status === 'active' && (
                <button
                  onClick={() => { setPreviewOpen(false); onListForSale(asset); }}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'linear-gradient(135deg,#d4af37,#b8882a)',
                    border: 'none', borderRadius: 14,
                    color: '#0a0800', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  🏷️ List for Sale
                </button>
              )}

              {asset.status === 'on_sale' && asset.listing_id && (
                <button
                  onClick={() => { setPreviewOpen(false); onCancelListing(asset.listing_id!); }}
                  style={{
                    flex: 1, padding: '14px',
                    background: '#e74c3c15', border: '1px solid #e74c3c40',
                    borderRadius: 14, color: '#e74c3c',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancel Listing
                </button>
              )}

              <button
                onClick={() => setPreviewOpen(false)}
                style={{
                  padding: '14px 20px',
                  background: '#ffffff08', border: '1px solid #ffffff10',
                  borderRadius: 14, color: '#6b6b7a',
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Asset Card ── */}
      <div
        onClick={() => setPreviewOpen(true)}
        style={{
          background: '#0d0d14',
          border: `1px solid ${colors.border}`,
          borderRadius: 18, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', transition: 'border-color 0.2s',
        }}
      >
        {/* ── Asset Image/Icon ── */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0, overflow: 'hidden',
          position: 'relative',
        }}>
          {nftImageUrl ? (
            <>
              <img
                src={nftImageUrl}
                alt={assetName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
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
            {assetName}
          </div>
          <div style={{
            display: 'inline-block',
            fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
            color: colors.status, background: colors.border,
            borderRadius: 6, padding: '2px 6px',
            textTransform: 'uppercase',
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
          <div style={{ fontSize: 10, color: '#4a4a5a' }}>
            Tap to preview
          </div>
        </div>
      </div>
    </>
  );
                    }
