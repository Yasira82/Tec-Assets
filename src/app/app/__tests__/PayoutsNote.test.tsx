import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../components/MarketplaceCard', () => ({ MarketplaceCard: () => null }));
import { MarketplaceTab } from '../components/MarketplaceTab';
import { PayoutsNote, COMMERCE_SALES_URL } from '../components/PayoutsNote';

// F2 (#70): an NFT seller is paid from ONE desk — TEC Commerce → Sales. Assets
// keeps no second copy; it tells the seller where the money is recorded and that
// an address must be there before anything can be sent.

const listing = (sellerId: string) => ({ id: `l-${sellerId}`, seller_id: sellerId } as never);
const noop = () => undefined;
const tab = (currentUserId: string, sellers: string[]) => render(
  <MarketplaceTab listings={sellers.map(listing)} currentUserId={currentUserId}
    onBuy={noop} onEditPrice={noop} onCancel={noop} onGoAssets={noop} />,
);

describe('where an NFT seller gets paid', () => {
  it('links to Commerce → Sales and says the address must come first', () => {
    render(<PayoutsNote />);
    const link = screen.getByRole('link', { name: /TEC Commerce → Sales/ });
    expect(link.getAttribute('href')).toBe(COMMERCE_SALES_URL);
    expect(screen.getByRole('note').textContent).toMatch(/nothing can be sent without it/);
  });

  it('the marketplace shows it to someone selling, and not to a buyer', () => {
    const seller = tab('me', ['me', 'other']);
    expect(seller.queryByRole('note')).not.toBeNull();
    seller.unmount();
    const buyer = tab('me', ['other']);
    expect(buyer.queryByRole('note')).toBeNull();
  });
});
