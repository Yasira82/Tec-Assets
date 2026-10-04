'use client';

// Where an NFT seller gets paid (F2, Tec-Assets #70 · tec-core-backend #369).
//
// A buyer's π lands in the app's wallet. What the seller is owed for an NFT sale
// is recorded at ONE payout desk for both marketplaces — TEC Commerce's Sales tab
// (owner's choice, 2026-10-04): one address, one place to see it. So Assets keeps
// no second copy; it says where to look, and that the address must exist before
// anything can be sent.

export const COMMERCE_SALES_URL = 'https://commerce.tecosystem.app/app';

export function PayoutsNote({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" style={{
      background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 12,
      padding: compact ? '10px 12px' : '12px 14px', margin: compact ? '0 0 12px' : '0 0 14px',
      fontSize: 12, color: '#8b8b9a', lineHeight: 1.5,
    }}>
      When an NFT of yours sells, what you are owed is recorded in{' '}
      <a href={COMMERCE_SALES_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#FBBF24', fontWeight: 700 }}>
        TEC Commerce → Sales
      </a>
      {' '}and sent to the Pi address you add there. Add it before your first sale — nothing can be sent without it.
    </div>
  );
}
