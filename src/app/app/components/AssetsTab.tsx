'use client';

import { Asset }     from '../types';
import { AssetCard } from './AssetCard';

const SkeletonCard = () => (
  <div style={{
    background: '#0d0d14', borderRadius: 18,
    border: '1px solid #ffffff08',
    animation: 'shimmer 1.4s ease infinite',
    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
  }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ffffff08', flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: '55%', height: 14, borderRadius: 6, background: '#ffffff08' }} />
      <div style={{ width: '30%', height: 10, borderRadius: 4, background: '#ffffff06' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
      <div style={{ width: 50, height: 12, borderRadius: 4, background: '#ffffff08' }} />
      <div style={{ width: 70, height: 28, borderRadius: 10, background: '#ffffff06' }} />
    </div>
  </div>
);

export function AssetsTab({
  assets, filtered, dataLoading, showValues,
  onListForSale, onCancelListing, onMintNFT, onGoMarketplace,
}: {
  assets:          Asset[];
  filtered:        Asset[];
  dataLoading:     boolean;
  showValues:      boolean;
  onListForSale:   (asset: Asset) => void;
  onCancelListing: (listingId: string) => void;
  onMintNFT:       () => void;
  onGoMarketplace: () => void;
}) {
  if (dataLoading) return <>{[1,2,3].map(i => <SkeletonCard key={i} />)}</>;

  if (filtered.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <div style={{ fontSize: 15, color: '#4a4a5a' }}>No assets yet</div>
      <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
        Mint an NFT or browse the Marketplace
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
        <button onClick={onMintNFT} style={{
          padding: '12px 20px',
          background: 'linear-gradient(135deg,#2d1b69,#1a0f3d)',
          border: '1px solid #7b6bc840', borderRadius: 14,
          color: '#b39ddb', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          🎨 Mint NFT
        </button>
        <button onClick={onGoMarketplace} style={{
          padding: '12px 20px',
          background: 'linear-gradient(135deg,#d4af37,#b8882a)',
          border: 'none', borderRadius: 14,
          color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          🛒 Marketplace
        </button>
      </div>
    </div>
  );

  return (
    <>
      {filtered.map(asset => (
        <AssetCard
          key={asset.id}
          asset={asset}
          showValues={showValues}
          onListForSale={onListForSale}
          onCancelListing={onCancelListing}
        />
      ))}
    </>
  );
}
