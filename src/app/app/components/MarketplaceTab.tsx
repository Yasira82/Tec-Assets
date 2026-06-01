'use client';

import { Listing }         from '../types';
import { MarketplaceCard } from './MarketplaceCard';

export function MarketplaceTab({
  listings, currentUserId, onBuy, onEditPrice, onCancel, onGoAssets,
}: {
  listings:      Listing[];
  currentUserId: string;
  onBuy:         (listing: Listing) => void;
  onEditPrice:   (listing: Listing) => void;
  onCancel:      (listing: Listing) => void;
  onGoAssets:    () => void;
}) {
  if (listings.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
      <div style={{ fontSize: 15, color: '#4a4a5a' }}>No listings yet</div>
      <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
        Be the first to list an asset for sale
      </div>
      <button onClick={onGoAssets} style={{
        marginTop: 20, padding: '12px 24px',
        background: 'linear-gradient(135deg,#d4af37,#b8882a)',
        border: 'none', borderRadius: 14,
        color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}>
        💎 My Assets
      </button>
    </div>
  );

  return (
    <>
      {listings.map(listing => (
        <MarketplaceCard
          key={listing.id}
          listing={listing}
          currentUserId={currentUserId}
          onBuy={onBuy}
          onEditPrice={onEditPrice}
          onCancel={onCancel}
        />
      ))}
    </>
  );
}
