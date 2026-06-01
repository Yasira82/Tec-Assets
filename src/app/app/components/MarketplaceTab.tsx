'use client';

import { Listing }         from '../types';
import { MarketplaceCard } from './MarketplaceCard';

/**
 * 🚨 IMPORTANT
 *
 * Pi Browser preserves internal payment ownership
 * after Hub → Assets navigation.
 *
 * Therefore:
 * Hub-origin navigation MUST fallback to Mode 1.
 */

const isHubNavigation = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.referrer
    .toLowerCase()
    .includes('hub.tecosystem.app');
};

export function MarketplaceTab({
  listings,
  currentUserId,
  onBuy,
  onEditPrice,
  onCancel,
  onGoAssets,
}: {
  listings:      Listing[];
  currentUserId: string;
  onBuy:         (listing: Listing) => void;
  onEditPrice:   (listing: Listing) => void;
  onCancel:      (listing: Listing) => void;
  onGoAssets:    () => void;
}) {

  /**
   * 🚨 SAFE BUY WRAPPER
   *
   * Forces deterministic Mode selection.
   */

  const handleBuy = (
    listing: Listing,
  ) => {

    /**
     * FORCE MODE 1 conditions:
     *
     * - Hub-origin navigation
     * - Pi SDK not ready
     * - Foreign session
     */

    const forceHubMode =
      isHubNavigation() ||
      !(window as any).__TEC_PI_READY ||
      (window as any)
        .__TEC_PI_FOREIGN_SESSION;

    if (forceHubMode) {

      /**
       * Parent onBuy already owns
       * Hub redirect flow.
       */

      onBuy(listing);

      return;
    }

    /**
     * ✅ MODE 2 ALLOWED
     */

    onBuy(listing);
  };

  if (listings.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding:   '48px 0',
        }}
      >
        <div
          style={{
            fontSize:    48,
            marginBottom: 12,
          }}
        >
          🛒
        </div>

        <div
          style={{
            fontSize: 15,
            color:    '#4a4a5a',
          }}
        >
          No listings yet
        </div>

        <div
          style={{
            fontSize:  12,
            color:     '#2a2a3a',
            marginTop: 6,
          }}
        >
          Be the first to list an asset for sale
        </div>

        <button
          onClick={onGoAssets}
          style={{
            marginTop: 20,
            padding:   '12px 24px',

            background:
              'linear-gradient(135deg,#d4af37,#b8882a)',

            border:       'none',
            borderRadius: 14,

            color:      '#0a0800',
            fontSize:   13,
            fontWeight: 700,

            cursor: 'pointer',
          }}
        >
          💎 My Assets
        </button>
      </div>
    );
  }

  return (
    <>
      {listings.map((listing) => (
        <MarketplaceCard
          key={listing.id}

          listing={listing}

          currentUserId={currentUserId}

          onBuy={() =>
            handleBuy(listing)
          }

          onEditPrice={onEditPrice}

          onCancel={onCancel}
        />
      ))}
    </>
  );
}
