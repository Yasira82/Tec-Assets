'use client';

import { Asset } from '../types';

const typeEmoji: Record<string, string> = {
  domain:        '🌐',
  nft:           '🎨',
  token:         '🪙',
  badge:         '🏆',
  digital_asset: '💎',
  default:       '💎',
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
  const typeEmoji: Record<string, string> = {
    domain:        '🌐',
    nft:           '🎨',
    token:         '🪙',
    badge:         '🏆',
    digital_asset: '💎',
    default:       '💎',
  };

  // ✅ NFT image من metadata
  const nftImageUrl = asset.asset_type === 'nft'
    ? (asset.metadata?.imageUrl as string | undefined)
    : undefined;

  return (
    <div style={{
      background: '#0d0d14', border: '1px solid #d4af3720',
      borderRadius: 18, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* ✅ NFT image أو emoji */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'linear-gradient(135deg,#1a1208,#0d0d14)',
        border: '1px solid #d4af3730',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0, overflow: 'hidden',
      }}>
        {nftImageUrl ? (
          <img
            src={nftImageUrl}
            alt={asset.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          typeEmoji[asset.asset_type] ?? typeEmoji.default
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {/* ✅ NFT name من metadata لو موجود */}
          {asset.asset_type === 'nft' && asset.metadata?.name
            ? asset.metadata.name as string
            : asset.name}
        </div>
        <div style={{ fontSize: 11, color: '#4a4a5a', textTransform: 'uppercase', letterSpacing: 1 }}>
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
              Listed 🏷️ {asset.listing_price}π
            </div>
            {asset.listing_id && (
              <button onClick={() => onCancelListing(asset.listing_id!)} style={{
                padding: '4px 10px', borderRadius: 10,
                background: '#e74c3c15', border: '1px solid #e74c3c40',
                color: '#e74c3c', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}>
                Cancel Listing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
