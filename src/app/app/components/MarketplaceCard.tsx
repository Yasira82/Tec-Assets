'use client';

import { Listing } from '../types';

const TEC_PAY_URL = 'https://tec-app-frontend.vercel.app/pay';

const typeEmoji: Record<string, string> = {
  domain:        '🌐',
  nft:           '🎨',
  token:         '🪙',
  badge:         '🏆',
  digital_asset: '💎',
  default:       '💎',
};

export function MarketplaceCard({
  listing,
  currentUserId,
  onEditPrice,
  onCancel,
}: {
  listing:       Listing;
  currentUserId: string;
  onEditPrice:   (listing: Listing) => void;
  onCancel:      (listing: Listing) => void;
}) {
  const isOwn = listing.seller_id === currentUserId;

  const handleBuy = () => {
    const params = new URLSearchParams({
      asset_id:   listing.asset_id,
      asset_type: listing.category,
      name:       listing.title,
      price:      listing.price.toString(),
      listing_id: listing.id,
      return_url: 'https://tec-assets-app.vercel.app/app',
    });
    window.location.href = `${TEC_PAY_URL}?${params.toString()}`;
  };

  return (
    <div style={{
      background: '#0d0d14', border: '1px solid #d4af3720',
      borderRadius: 18, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'linear-gradient(135deg,#1a1208,#0d0d14)',
        border: '1px solid #d4af3730',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>
        {typeEmoji[listing.category] ?? typeEmoji.default}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {listing.title}
        </div>
        <div style={{ fontSize: 11, color: '#4a4a5a', textTransform: 'uppercase', letterSpacing: 1 }}>
          {listing.category}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#d4af37' }}>
          {listing.price}π
        </div>
        {isOwn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <button onClick={() => onEditPrice(listing)} style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#d4af3715', border: '1px solid #d4af3740',
              color: '#d4af37', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              Edit Price
            </button>
            <button onClick={() => onCancel(listing)} style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#e74c3c15', border: '1px solid #e74c3c40',
              color: '#e74c3c', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={handleBuy} style={{
            padding: '6px 14px', borderRadius: 10,
            background: 'linear-gradient(135deg,#0d2e14,#0a1f0f)',
            border: '1px solid #7ee7c040',
            color: '#7ee7c0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Buy
          </button>
        )}
      </div>
    </div>
  );
}
