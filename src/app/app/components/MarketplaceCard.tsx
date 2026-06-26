'use client';

import { useState } from 'react';
import { Listing }  from '../types';

const typeEmoji: Record<string, string> = {
  domain: '🌐', nft: '🎨', token: '🪙', badge: '🏆',
  digital_asset: '💎', default: '💎',
};

const categoryColors: Record<string, { border: string; bg: string; accent: string }> = {
  nft:           { border: '#7b6bc840', bg: 'linear-gradient(135deg,#1a0f3d,#0B1020)', accent: '#b39ddb' },
  domain:        { border: '#7eb8f740', bg: 'linear-gradient(135deg,#0a2040,#0B1020)', accent: '#7eb8f7' },
  token:         { border: '#FBBF2440', bg: 'linear-gradient(135deg,#1a1208,#0B1020)', accent: '#FBBF24' },
  badge:         { border: '#7ee7c040', bg: 'linear-gradient(135deg,#0d2e14,#0B1020)', accent: '#7ee7c0' },
  digital_asset: { border: '#FBBF2420', bg: 'linear-gradient(135deg,#0B1020,#0B1020)', accent: '#6b6b7a' },
  default:       { border: '#FBBF2420', bg: 'linear-gradient(135deg,#0B1020,#0B1020)', accent: '#FBBF24' },
};

export function MarketplaceCard({
  listing, currentUserId, onBuy, onEditPrice, onCancel,
}: {
  listing:       Listing;
  currentUserId: string;
  onBuy:         (listing: Listing) => void;
  onEditPrice:   (listing: Listing) => void;
  onCancel:      (listing: Listing) => void;
}) {
  const [buying, setBuying] = useState(false);

  const isOwn   = listing.seller_id === currentUserId; // ✅ fix
  const colors  = categoryColors[listing.category] ?? categoryColors.default;
  const imageUrl = (listing.metadata as Record<string, unknown> | undefined)
    ?.imageUrl as string | undefined;

  const handleBuy = () => {
    if (buying) return;
    setBuying(true);
    onBuy(listing);
  };

  return (
    <div
      onTouchStart={e => {
        e.currentTarget.style.transform = 'scale(0.98)';
        e.currentTarget.style.boxShadow = `0 4px 20px ${colors.border}`;
      }}
      onTouchEnd={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = colors.accent;
        e.currentTarget.style.boxShadow   = `0 4px 20px ${colors.border}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow   = 'none';
      }}
      style={{
        background:  '#0B1020',
        border:      `1px solid ${colors.border}`,
        borderRadius: 18,
        padding:     '16px 20px',
        display:     'flex',
        alignItems:  'center',
        gap:          14,
        transition:  'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Image / Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: colors.bg, border: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0, overflow: 'hidden',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          typeEmoji[listing.category] ?? typeEmoji.default
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {listing.title}
        </div>
        <div style={{
          display: 'inline-block', fontSize: 9, fontWeight: 700,
          letterSpacing: 1.5, color: colors.accent,
          background: `${colors.accent}15`,
          borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase',
        }}>
          {listing.category}
        </div>
        {listing.description && (
          <div style={{
            fontSize: 11, color: '#4a4a5a', marginTop: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {listing.description}
          </div>
        )}
      </div>

      {/* Price + Action */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#FBBF24' }}>
          {listing.price}π
        </div>

        {isOwn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => onEditPrice(listing)} style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#FBBF2415', border: '1px solid #FBBF2440',
              color: '#FBBF24', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              ✏️ Edit
            </button>
            <button onClick={() => onCancel(listing)} style={{
              padding: '5px 12px', borderRadius: 10,
              background: '#e74c3c15', border: '1px solid #e74c3c40',
              color: '#e74c3c', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              ✕ Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleBuy}
            disabled={buying}
            style={{
              padding: '8px 16px', borderRadius: 12,
              background: buying
                ? '#ffffff10'
                : 'linear-gradient(135deg,#0d2e14,#0a1f0f)',
              border:     '1px solid #7ee7c040',
              color:      buying ? '#4a4a5a' : '#7ee7c0',
              fontSize:   12, fontWeight: 700,
              cursor:     buying ? 'not-allowed' : 'pointer',
              display:    'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {buying ? (
              <>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: '2px solid #4a4a5a30',
                  borderTopColor: '#7ee7c0',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block',
                }} />
                Processing...
              </>
            ) : '🛒 Buy'}
          </button>
        )}
      </div>
    </div>
  );
}
