import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent }             from '@testing-library/react';
import React                                      from 'react';

// ✅ any بدل inline TypeScript types في الـ mock factory
vi.mock('../components/AssetCard', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AssetCard: (props: any) =>
    React.createElement('div', { 'data-testid': `asset-${props.asset.id}` },
      React.createElement('span', null, props.asset.name),
      React.createElement('button', { 'data-testid': `list-${props.asset.id}`,     onClick: () => props.onListForSale(props.asset)                       }, 'List'),
      React.createElement('button', { 'data-testid': `transfer-${props.asset.id}`, onClick: () => props.onTransfer(props.asset)                          }, 'Transfer'),
      React.createElement('button', { 'data-testid': `cancel-${props.asset.id}`,   onClick: () => props.onCancelListing(props.asset.listing_id ?? '')    }, 'Cancel'),
    ),
}));

import { AssetsTab } from '../components/AssetsTab';
import { Asset }     from '../types';

const makeAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id:            'asset-1',
  name:          'Pyramids NFT',
  asset_type:    'nft',
  value:         10,
  currency:      'PI',
  status:        'active',
  created_at:    new Date().toISOString(),
  listing_id:    null,
  listing_price: null,
  ...overrides,
});

const defaultProps = {
  assets:          [] as Asset[],
  filtered:        [] as Asset[],
  dataLoading:     false,
  showValues:      true,
  onListForSale:   vi.fn(),
  onCancelListing: vi.fn(),
  onMintNFT:       vi.fn(),
  onGoMarketplace: vi.fn(),
  onTransfer:      vi.fn(),
  onRefresh:       vi.fn(),
};

describe('AssetsTab', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  // ── Empty State ───────────────────────────────────────

  it('يعرض empty state لو مفيش assets', () => {
    render(React.createElement(AssetsTab, { ...defaultProps }));
    expect(screen.getByText(/no assets yet/i)).toBeDefined();
  });

  it('يعرض Mint NFT button في empty state', () => {
    render(React.createElement(AssetsTab, { ...defaultProps }));
    fireEvent.click(screen.getByText(/mint nft/i));
    expect(defaultProps.onMintNFT).toHaveBeenCalledOnce();
  });

  it('يعرض Marketplace button في empty state', () => {
    render(React.createElement(AssetsTab, { ...defaultProps }));
    fireEvent.click(screen.getByText(/marketplace/i));
    expect(defaultProps.onGoMarketplace).toHaveBeenCalledOnce();
  });

  // ── Loading ───────────────────────────────────────────

  it('يعرض skeleton لو dataLoading', () => {
    render(React.createElement(AssetsTab, { ...defaultProps, dataLoading: true }));
    expect(screen.queryByText(/no assets/i)).toBeNull();
  });

  // ── Assets List ───────────────────────────────────────

  it('يعرض assets', () => {
    const assets = [makeAsset({ id: 'a1', name: 'NFT 1' }), makeAsset({ id: 'a2', name: 'NFT 2' })];
    render(React.createElement(AssetsTab, { ...defaultProps, assets, filtered: assets }));
    expect(screen.getByTestId('asset-a1')).toBeDefined();
    expect(screen.getByTestId('asset-a2')).toBeDefined();
  });

  it('يعرض فقط الـ filtered assets', () => {
    const assets   = [makeAsset({ id: 'a1' }), makeAsset({ id: 'a2' })];
    const filtered = [makeAsset({ id: 'a1' })];
    render(React.createElement(AssetsTab, { ...defaultProps, assets, filtered }));
    expect(screen.getByTestId('asset-a1')).toBeDefined();
    expect(screen.queryByTestId('asset-a2')).toBeNull();
  });

  // ── Actions ───────────────────────────────────────────

  it('onListForSale يتعمل', () => {
    const assets = [makeAsset({ id: 'a1' })];
    render(React.createElement(AssetsTab, { ...defaultProps, assets, filtered: assets }));
    fireEvent.click(screen.getByTestId('list-a1'));
    expect(defaultProps.onListForSale).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
  });

  it('onTransfer يتعمل', () => {
    const assets = [makeAsset({ id: 'a1' })];
    render(React.createElement(AssetsTab, { ...defaultProps, assets, filtered: assets }));
    fireEvent.click(screen.getByTestId('transfer-a1'));
    expect(defaultProps.onTransfer).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
  });

  it('onCancelListing يتعمل', () => {
    const assets = [makeAsset({ id: 'a1', listing_id: 'listing-001' })];
    render(React.createElement(AssetsTab, { ...defaultProps, assets, filtered: assets }));
    fireEvent.click(screen.getByTestId('cancel-a1'));
    expect(defaultProps.onCancelListing).toHaveBeenCalledWith('listing-001');
  });
});
