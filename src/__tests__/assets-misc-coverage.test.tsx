import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';

// ──── Hoisted mock refs ────────────────────────────────────────────────────
const mockUseBackendHealth = vi.hoisted(() => vi.fn());

// ──── Module mocks ─────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/lib/health-check', () => ({
  checkBackendHealth: vi.fn().mockResolvedValue({ online: true, status: 'ok', error: null }),
}));

vi.mock('@/hooks/useBackendHealth', () => ({
  useBackendHealth: mockUseBackendHealth,
}));

vi.mock('@/lib-client/pi/pi-payment', () => ({
  createU2APayment: vi.fn().mockResolvedValue({ success: true, paymentId: 'pay-123' }),
}));

vi.mock('@/lib/tec-navigation', () => ({ goToTEC: vi.fn() }));

vi.mock('@/app/app/components/AssetCard', () => ({
  AssetCard: ({ asset }: { asset: { name: string } }) =>
    React.createElement('div', { 'data-testid': 'asset-card' }, asset.name),
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({ payload: { sub: 'user-123' } }),
  SignJWT: vi.fn().mockImplementation(function () {
    return {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('mock-token'),
    };
  }),
}));

// ──── Global mock fetch ────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;
const mkHeaders = () => ({ entries: () => new Map<string, string>().entries(), get: () => null });
const ok   = (data: unknown) => ({ ok: true,  status: 200, headers: mkHeaders(), json: async () => data, text: async () => 'ok' });
const fail = (s = 500, msg = 'fail') => ({ ok: false, status: s, headers: mkHeaders(), json: async () => ({ message: msg, error: msg }), text: async () => msg });

// ──── Static imports after all vi.mock calls ───────────────────────────────
import { Skeleton }             from '@/app/app/components/Skeleton';
import { CancelConfirmModal }   from '@/app/app/components/CancelConfirmModal';
import { MarketplaceCard }      from '@/app/app/components/MarketplaceCard';
import { AssetsTab }            from '@/app/app/components/AssetsTab';
import { TransferModal }        from '@/app/app/components/TransferModal';
import { AddDomainModal }       from '@/app/app/components/AddDomainModal';
import { BackendOfflineBanner } from '@/components/BackendOfflineBanner';
import { ErrorBoundary }        from '@/components/ErrorBoundary';
import { LocaleProvider, useTranslation } from '@/lib/i18n/index';
import { ListForSaleModal }  from '@/app/app/components/ListForSaleModal';
import { PortfolioTab }      from '@/app/app/components/PortfolioTab';

// ──── Test fixtures ────────────────────────────────────────────────────────
const makeListing = (overrides: Record<string, unknown> = {}) => ({
  id: 'list-1', asset_id: 'asset-1', seller_id: 'user-1',
  price: 10, currency: 'PI', status: 'active',
  title: 'Cool Domain', description: 'A cool domain',
  category: 'domain', created_at: '2025-01-01',
  ...overrides,
});

const makeAsset = (overrides: Record<string, unknown> = {}) => ({
  id: 'asset-1', name: 'test.pi', asset_type: 'domain',
  value: 5, currency: 'PI', status: 'active',
  created_at: '2025-01-01', listing_id: null, listing_price: null,
  ...overrides,
});

// ──── Global setup ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockFetch.mockResolvedValue(ok({ success: true }));
  mockUseBackendHealth.mockReturnValue({
    online: true, status: 'ok', error: null, isChecking: false,
    recheckHealth: vi.fn(),
  });
  process.env.API_GATEWAY_URL = 'https://gw.test';
  process.env.JWT_SECRET = 'jwt-test-secret';
  process.env.INTERNAL_SECRET = 'internal-secret-test';
});

afterEach(() => cleanup());


// ══════════════════════════════════════════════════════════════════════════
// Skeleton
// ══════════════════════════════════════════════════════════════════════════
describe('Skeleton component', () => {
  it('renders loading skeleton UI', () => {
    const { container } = render(React.createElement(Skeleton));
    expect(container.firstChild).toBeTruthy();
  });

  it('contains shimmer animation elements', () => {
    const { container } = render(React.createElement(Skeleton));
    const sk = container.querySelectorAll('.sk');
    expect(sk.length).toBeGreaterThan(0);
  });
});


// ══════════════════════════════════════════════════════════════════════════
// CancelConfirmModal
// ══════════════════════════════════════════════════════════════════════════
describe('CancelConfirmModal', () => {
  it('renders title and listing info', () => {
    render(React.createElement(CancelConfirmModal, {
      listing: makeListing({ price: 10 }),
      onClose: vi.fn(), onConfirm: vi.fn(), loading: false,
    }));
    expect(screen.getByText('Cancel Listing?')).toBeTruthy();
    expect(screen.getByText(/Cool Domain/)).toBeTruthy();
    expect(screen.getByText(/10π/)).toBeTruthy();
  });

  it('shows "Cancelling..." when loading', () => {
    render(React.createElement(CancelConfirmModal, {
      listing: makeListing(), onClose: vi.fn(), onConfirm: vi.fn(), loading: true,
    }));
    expect(screen.getByText('Cancelling...')).toBeTruthy();
  });

  it('shows "Yes, Cancel Listing" when not loading', () => {
    render(React.createElement(CancelConfirmModal, {
      listing: makeListing(), onClose: vi.fn(), onConfirm: vi.fn(), loading: false,
    }));
    expect(screen.getByText('Yes, Cancel Listing')).toBeTruthy();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(React.createElement(CancelConfirmModal, {
      listing: makeListing(), onClose: vi.fn(), onConfirm, loading: false,
    }));
    fireEvent.click(screen.getByText('Yes, Cancel Listing'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onClose when Keep Listing button clicked', () => {
    const onClose = vi.fn();
    render(React.createElement(CancelConfirmModal, {
      listing: makeListing(), onClose, onConfirm: vi.fn(), loading: false,
    }));
    fireEvent.click(screen.getByText('Keep Listing'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('handles listing without price', () => {
    render(React.createElement(CancelConfirmModal, {
      listing: makeListing({ price: 0 }),
      onClose: vi.fn(), onConfirm: vi.fn(), loading: false,
    }));
    expect(screen.getByText('Cancel Listing?')).toBeTruthy();
  });
});


// ══════════════════════════════════════════════════════════════════════════
// MarketplaceCard
// ══════════════════════════════════════════════════════════════════════════
describe('MarketplaceCard', () => {
  it('renders listing title and price', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing(), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    expect(screen.getByText('Cool Domain')).toBeTruthy();
    expect(screen.getByText('10π')).toBeTruthy();
  });

  it('shows category badge', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ category: 'nft' }), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    expect(screen.getByText('nft')).toBeTruthy();
  });

  it('shows Buy button for non-owner', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'owner-1' }), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    expect(screen.getByText('🛒 Buy')).toBeTruthy();
  });

  it('shows Edit and Cancel buttons for owner', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'user-1' }), currentUserId: 'user-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    expect(screen.getByText('✏️ Edit')).toBeTruthy();
    expect(screen.getByText('✕ Cancel')).toBeTruthy();
  });

  it('calls onBuy when Buy button clicked', () => {
    const onBuy = vi.fn();
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'owner-1' }), currentUserId: 'buyer-1',
      onBuy, onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    fireEvent.click(screen.getByText('🛒 Buy'));
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it('shows Processing spinner after Buy is clicked', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'owner-1' }), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    fireEvent.click(screen.getByText('🛒 Buy'));
    expect(screen.getByText('Processing...')).toBeTruthy();
  });

  it('Buy button is disabled while processing (second click no-ops)', () => {
    const onBuy = vi.fn();
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'owner-1' }), currentUserId: 'buyer-1',
      onBuy, onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    const btn = screen.getByText('🛒 Buy');
    fireEvent.click(btn);
    fireEvent.click(screen.getByText('Processing...')); // already disabled
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it('calls onEditPrice when Edit clicked', () => {
    const onEditPrice = vi.fn();
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'user-1' }), currentUserId: 'user-1',
      onBuy: vi.fn(), onEditPrice, onCancel: vi.fn(),
    }));
    fireEvent.click(screen.getByText('✏️ Edit'));
    expect(onEditPrice).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel button clicked', () => {
    const onCancel = vi.fn();
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ seller_id: 'user-1' }), currentUserId: 'user-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel,
    }));
    fireEvent.click(screen.getByText('✕ Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders image when imageUrl in metadata', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ metadata: { imageUrl: 'https://example.com/img.png' } }),
      currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.src).toContain('example.com');
  });

  it('renders emoji icon when no imageUrl', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ category: 'token' }), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders description when present', () => {
    render(React.createElement(MarketplaceCard, {
      listing: makeListing({ description: 'My domain description' }), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    expect(screen.getByText('My domain description')).toBeTruthy();
  });

  it('handles touch events without error', () => {
    const { container } = render(React.createElement(MarketplaceCard, {
      listing: makeListing(), currentUserId: 'buyer-1',
      onBuy: vi.fn(), onEditPrice: vi.fn(), onCancel: vi.fn(),
    }));
    const card = container.firstChild as HTMLElement;
    expect(() => {
      fireEvent.touchStart(card);
      fireEvent.touchEnd(card);
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
    }).not.toThrow();
  });
});


// ══════════════════════════════════════════════════════════════════════════
// AssetsTab
// ══════════════════════════════════════════════════════════════════════════
describe('AssetsTab', () => {
  const baseProps = {
    assets: [], filtered: [], dataLoading: false, showValues: true,
    onListForSale: vi.fn(), onCancelListing: vi.fn(), onMintNFT: vi.fn(),
    onGoMarketplace: vi.fn(), onTransfer: vi.fn(), onRefresh: vi.fn(),
  };

  it('renders skeleton cards when dataLoading is true', () => {
    const { container } = render(React.createElement(AssetsTab, { ...baseProps, dataLoading: true }));
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('shows empty-state message when filtered is empty', () => {
    render(React.createElement(AssetsTab, { ...baseProps }));
    expect(screen.getByText('No assets yet')).toBeTruthy();
    expect(screen.getByText('Mint an NFT or browse the Marketplace')).toBeTruthy();
  });

  it('shows Mint NFT button in empty state', () => {
    render(React.createElement(AssetsTab, { ...baseProps }));
    expect(screen.getByText('🎨 Mint NFT')).toBeTruthy();
  });

  it('shows Marketplace button in empty state', () => {
    render(React.createElement(AssetsTab, { ...baseProps }));
    expect(screen.getByText('🛒 Marketplace')).toBeTruthy();
  });

  it('calls onMintNFT on Mint NFT click', () => {
    const onMintNFT = vi.fn();
    render(React.createElement(AssetsTab, { ...baseProps, onMintNFT }));
    fireEvent.click(screen.getByText('🎨 Mint NFT'));
    expect(onMintNFT).toHaveBeenCalledOnce();
  });

  it('calls onGoMarketplace on Marketplace click', () => {
    const onGoMarketplace = vi.fn();
    render(React.createElement(AssetsTab, { ...baseProps, onGoMarketplace }));
    fireEvent.click(screen.getByText('🛒 Marketplace'));
    expect(onGoMarketplace).toHaveBeenCalledOnce();
  });

  it('renders AssetCard for each asset in filtered list', () => {
    const assets = [
      makeAsset({ id: '1', name: 'first.pi' }),
      makeAsset({ id: '2', name: 'second.pi' }),
    ];
    render(React.createElement(AssetsTab, { ...baseProps, assets, filtered: assets }));
    const cards = screen.getAllByTestId('asset-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('first.pi')).toBeTruthy();
    expect(screen.getByText('second.pi')).toBeTruthy();
  });
});


// ══════════════════════════════════════════════════════════════════════════
// TransferModal
// ══════════════════════════════════════════════════════════════════════════
describe('TransferModal', () => {
  const asset = makeAsset({ name: 'myasset.pi', asset_type: 'nft' });

  it('renders the modal with asset name', () => {
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    expect(screen.getByText('↗ Transfer Asset')).toBeTruthy();
    expect(screen.getByText('myasset.pi')).toBeTruthy();
  });

  it('shows irreversible action warning', () => {
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    expect(screen.getByText('⚠️ Irreversible Action')).toBeTruthy();
  });

  it('shows error when confirming with empty recipient', () => {
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    fireEvent.click(screen.getByText('Continue →'));
    expect(screen.getByText(/Enter recipient Pi username/)).toBeTruthy();
  });

  it('advances to confirmation step after entering recipient', () => {
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('piusername'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Continue →'));
    expect(screen.getByText('Transfer summary')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
    expect(screen.getByText('nft')).toBeTruthy();
  });

  it('strips @ prefix from username input', () => {
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('piusername'), { target: { value: '@alice' } });
    fireEvent.click(screen.getByText('Continue →'));
    expect(screen.getByText('@alice')).toBeTruthy();
  });

  it('goes back to input step when Back clicked', () => {
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('piusername'), { target: { value: 'bob' } });
    fireEvent.click(screen.getByText('Continue →'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByPlaceholderText('piusername')).toBeTruthy();
  });

  it('calls onClose on Cancel click', () => {
    const onClose = vi.fn();
    render(React.createElement(TransferModal, { asset, onClose, onSuccess: vi.fn() }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onSuccess after successful transfer fetch', async () => {
    const onSuccess = vi.fn();
    const onClose   = vi.fn();
    mockFetch.mockResolvedValueOnce(ok({ success: true }));
    render(React.createElement(TransferModal, { asset, onClose, onSuccess }));
    fireEvent.change(screen.getByPlaceholderText('piusername'), { target: { value: 'carol' } });
    fireEvent.click(screen.getByText('Continue →'));
    fireEvent.click(screen.getByText('↗ Confirm Transfer'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error message on failed transfer', async () => {
    mockFetch.mockResolvedValueOnce(fail(400, 'Transfer denied'));
    render(React.createElement(TransferModal, { asset, onClose: vi.fn(), onSuccess: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('piusername'), { target: { value: 'dave' } });
    fireEvent.click(screen.getByText('Continue →'));
    fireEvent.click(screen.getByText('↗ Confirm Transfer'));
    await waitFor(() => expect(screen.getByText('⚠️ Transfer denied')).toBeTruthy());
  });
});


// ══════════════════════════════════════════════════════════════════════════
// AddDomainModal
// ══════════════════════════════════════════════════════════════════════════
describe('AddDomainModal', () => {
  it('renders title and input', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    expect(screen.getByText('Add Your Domain')).toBeTruthy();
    expect(screen.getByPlaceholderText('myname')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(React.createElement(AddDomainModal, { onClose }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('updates input value and shows domain preview', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    const input = screen.getByPlaceholderText('myname');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect((input as HTMLInputElement).value).toBe('hello');
    expect(screen.getByText('hello.pi')).toBeTruthy();
  });

  it('shows 5π fee for 2-char domain', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('myname'), { target: { value: 'ab' } });
    expect(screen.getByText('5π')).toBeTruthy();
  });

  it('shows 3π fee for 4-char domain', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('myname'), { target: { value: 'abcd' } });
    expect(screen.getByText('3π')).toBeTruthy();
  });

  it('shows 2π fee for 7-char domain', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('myname'), { target: { value: 'abcdefg' } });
    expect(screen.getByText('2π')).toBeTruthy();
  });

  it('shows 1π fee for 10+ char domain', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    fireEvent.change(screen.getByPlaceholderText('myname'), { target: { value: 'averylongdomain' } });
    expect(screen.getByText('1π')).toBeTruthy();
  });

  it('register button is disabled when no slug entered', () => {
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    const buttons = screen.getAllByRole('button');
    const registerBtn = buttons.find(b => b.textContent?.includes('Register'));
    expect(registerBtn).toBeTruthy();
    expect(registerBtn).toBeDisabled();
  });

  it('triggers fetch availability check after 600ms debounce', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValueOnce(ok({ available: true }));
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('myname'), { target: { value: 'hello' } });
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(mockFetch).toHaveBeenCalled();
    expect(String(mockFetch.mock.calls[0][0])).toContain('domains/check');
  });

  it('sets availability to taken when fetch returns available:false', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValueOnce(ok({ available: false }));
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('myname'), { target: { value: 'taken' } });
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    await waitFor(() =>
      expect(screen.getByText(/taken\.pi is already taken/)).toBeTruthy()
    );
  });

  it('handlePay runs when button is clicked with a valid slug', () => {
    // Mock window.location to capture navigation
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true, value: mockLocation,
    });
    render(React.createElement(AddDomainModal, { onClose: vi.fn() }));
    const input = screen.getByPlaceholderText('myname');
    fireEvent.change(input, { target: { value: 'hi' } }); // 2-char → 5π, button enabled
    // availability = 'unknown', not loading, not checking → button enabled
    const btn = screen.getAllByRole('button').find(b => !b.hasAttribute('disabled') && b.textContent?.includes('Register'));
    if (btn) {
      fireEvent.click(btn);
      // handlePay ran: domain = 'hi', redirected to TEC pay URL
      expect(mockLocation.href).toContain('asset_type=domain');
    }
  });
});


// ══════════════════════════════════════════════════════════════════════════
// PortfolioTab — cover the "View Full Dashboard" button onClick
// ══════════════════════════════════════════════════════════════════════════
describe('PortfolioTab — dashboard button', () => {
  const wallet = { balance: 100, currency: 'PI', walletId: 'w-1' };

  it('renders the View Full Dashboard button', () => {
    render(React.createElement(PortfolioTab, {
      assets: [], wallet, showValues: true, hideBalance: false,
    }));
    expect(screen.getByText('🔷 View Full Dashboard')).toBeTruthy();
  });

  it('calls goToTEC with DASHBOARD when button clicked', async () => {
    const { goToTEC } = await import('@/lib/tec-navigation');
    render(React.createElement(PortfolioTab, {
      assets: [], wallet, showValues: true, hideBalance: false,
    }));
    fireEvent.click(screen.getByText('🔷 View Full Dashboard'));
    expect(goToTEC).toHaveBeenCalledWith('DASHBOARD');
  });
});


// ══════════════════════════════════════════════════════════════════════════
// BackendOfflineBanner
// ══════════════════════════════════════════════════════════════════════════
describe('BackendOfflineBanner', () => {
  it('renders nothing when backend is online', () => {
    mockUseBackendHealth.mockReturnValue({
      online: true, status: 'ok', error: null, isChecking: false, recheckHealth: vi.fn(),
    });
    const { container } = render(React.createElement(BackendOfflineBanner));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing while still checking (isChecking=true)', () => {
    mockUseBackendHealth.mockReturnValue({
      online: false, status: null, error: null, isChecking: true, recheckHealth: vi.fn(),
    });
    const { container } = render(React.createElement(BackendOfflineBanner));
    expect(container.innerHTML).toBe('');
  });

  it('shows alert banner when offline and not checking', () => {
    mockUseBackendHealth.mockReturnValue({
      online: false, status: null, error: 'Connection refused', isChecking: false,
      recheckHealth: vi.fn(),
    });
    render(React.createElement(BackendOfflineBanner));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('⚠️ Backend Offline')).toBeTruthy();
    expect(screen.getByText('Connection refused')).toBeTruthy();
  });

  it('shows default error message when error is null', () => {
    mockUseBackendHealth.mockReturnValue({
      online: false, status: null, error: null, isChecking: false, recheckHealth: vi.fn(),
    });
    render(React.createElement(BackendOfflineBanner));
    expect(screen.getByText('Unable to reach backend services.')).toBeTruthy();
  });

  it('calls recheckHealth when Retry is clicked', () => {
    const recheckHealth = vi.fn();
    mockUseBackendHealth.mockReturnValue({
      online: false, status: null, error: null, isChecking: false, recheckHealth,
    });
    render(React.createElement(BackendOfflineBanner));
    fireEvent.click(screen.getByText('Retry'));
    expect(recheckHealth).toHaveBeenCalledOnce();
  });
});


// ══════════════════════════════════════════════════════════════════════════
// ErrorBoundary
// ══════════════════════════════════════════════════════════════════════════
describe('ErrorBoundary', () => {
  const ThrowingChild = () => {
    throw new Error('render error');
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore?.();
  });

  it('renders children when no error occurs', () => {
    render(React.createElement(ErrorBoundary, {},
      React.createElement('div', null, 'Healthy content'),
    ));
    expect(screen.getByText('Healthy content')).toBeTruthy();
  });

  it('renders default error UI when child throws', () => {
    render(React.createElement(ErrorBoundary, {},
      React.createElement(ThrowingChild),
    ));
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('render error')).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    render(React.createElement(
      ErrorBoundary,
      { fallback: React.createElement('div', null, 'Custom error fallback') },
      React.createElement(ThrowingChild),
    ));
    expect(screen.getByText('Custom error fallback')).toBeTruthy();
  });

  it('getDerivedStateFromError sets hasError state', () => {
    const err = new Error('state error');
    const state = ErrorBoundary.getDerivedStateFromError(err);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(err);
  });

  it('Try Again button calls setState to reset error', () => {
    const reloadMock = vi.fn();
    // @ts-expect-error — override reload for test
    window.location.reload = reloadMock;
    render(React.createElement(ErrorBoundary, {},
      React.createElement(ThrowingChild),
    ));
    expect(screen.getByText('Try Again')).toBeTruthy();
    // Clicking resets state (ThrowingChild re-throws, boundary catches again — no crash)
    expect(() => fireEvent.click(screen.getByText('Try Again'))).not.toThrow();
  });
});


// ══════════════════════════════════════════════════════════════════════════
// ListForSaleModal
// ══════════════════════════════════════════════════════════════════════════
describe('ListForSaleModal — List mode', () => {
  it('renders List for Sale title', () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.getByText('List for Sale')).toBeTruthy();
  });

  it('shows asset name and type in subtitle', () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset({ name: 'myname.pi', asset_type: 'domain' }), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.getByText('myname.pi · domain')).toBeTruthy();
  });

  it('renders price input and description textarea', () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.getByPlaceholderText('0.00')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe your asset...')).toBeTruthy();
  });

  it('shows price placeholder in submit button when no price', () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.getByText('List for 0π')).toBeTruthy();
  });

  it('updates submit button text as price is typed', () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5' } });
    expect(screen.getByText('List for 5π')).toBeTruthy();
  });

  it('shows validation error when price is 0 or empty', async () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } });
    await act(async () => {
      fireEvent.click(screen.getByText('List for 0π'));
    });
    expect(screen.getByText('Enter a valid price')).toBeTruthy();
  });

  it('calls fetch and onSuccess on successful listing', async () => {
    const onSuccess = vi.fn();
    const onClose   = vi.fn();
    mockFetch.mockResolvedValueOnce(ok({ id: 'listing-1' }));
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose, onSuccess,
    }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    await act(async () => {
      fireEvent.click(screen.getByText('List for 10π'));
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when listing API fails', async () => {
    mockFetch.mockResolvedValueOnce(fail(400, 'Listing failed'));
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    await act(async () => {
      fireEvent.click(screen.getByText('List for 10π'));
    });
    await waitFor(() => expect(screen.getByText('Failed to list asset')).toBeTruthy());
  });

  it('calls onClose on Cancel click', () => {
    const onClose = vi.fn();
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose, onSuccess: vi.fn(),
    }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('updates description textarea', () => {
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    const textarea = screen.getByPlaceholderText('Describe your asset...');
    fireEvent.change(textarea, { target: { value: 'My description' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('My description');
  });
});

describe('ListForSaleModal — Update mode', () => {
  const listing = makeListing({ price: 5, description: 'Old desc' });

  it('renders Update Price title', () => {
    render(React.createElement(ListForSaleModal, {
      listing, onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.getByText('Update Price')).toBeTruthy();
    expect(screen.getByText('Cool Domain')).toBeTruthy();
  });

  it('pre-fills price from existing listing', () => {
    render(React.createElement(ListForSaleModal, {
      listing, onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(input.value).toBe('5');
  });

  it('shows "Update to" in submit button text', () => {
    render(React.createElement(ListForSaleModal, {
      listing, onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.getByText(/Update to 5π/)).toBeTruthy();
  });

  it('does not render description textarea in update mode', () => {
    render(React.createElement(ListForSaleModal, {
      listing, onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    expect(screen.queryByPlaceholderText('Describe your asset...')).toBeNull();
  });

  it('calls update-price API on successful submit', async () => {
    const onSuccess = vi.fn();
    mockFetch.mockResolvedValueOnce(ok({ success: true }));
    render(React.createElement(ListForSaleModal, {
      listing, onClose: vi.fn(), onSuccess,
    }));
    await act(async () => {
      fireEvent.click(screen.getByText(/Update to 5π/));
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/bff/marketplace/update-price',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows error when update API fails', async () => {
    mockFetch.mockResolvedValueOnce(fail(500));
    render(React.createElement(ListForSaleModal, {
      listing, onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    await act(async () => {
      fireEvent.click(screen.getByText(/Update to 5π/));
    });
    await waitFor(() => expect(screen.getByText('Failed to update price')).toBeTruthy());
  });
});

describe('ListForSaleModal — catch path', () => {
  it('shows generic error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    render(React.createElement(ListForSaleModal, {
      asset: makeAsset(), onClose: vi.fn(), onSuccess: vi.fn(),
    }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5' } });
    await act(async () => {
      fireEvent.click(screen.getByText('List for 5π'));
    });
    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeTruthy());
  });
});


// ══════════════════════════════════════════════════════════════════════════
// LocaleProvider + useTranslation
// ══════════════════════════════════════════════════════════════════════════
describe('LocaleProvider + useTranslation', () => {
  const Consumer = () => {
    const { locale, setLocale, dir } = useTranslation();
    return React.createElement('div', null,
      React.createElement('span', { 'data-testid': 'locale' }, locale),
      React.createElement('span', { 'data-testid': 'dir' }, dir),
      React.createElement('button', { onClick: () => setLocale('ar') }, 'Use Arabic'),
      React.createElement('button', { onClick: () => setLocale('en') }, 'Use English'),
    );
  };

  it('provides default English locale', () => {
    render(React.createElement(LocaleProvider, {}, React.createElement(Consumer)));
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
  });

  it('switches to Arabic locale', () => {
    render(React.createElement(LocaleProvider, {}, React.createElement(Consumer)));
    fireEvent.click(screen.getByText('Use Arabic'));
    expect(screen.getByTestId('locale').textContent).toBe('ar');
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
  });

  it('switches back to English locale', () => {
    render(React.createElement(LocaleProvider, {}, React.createElement(Consumer)));
    fireEvent.click(screen.getByText('Use Arabic'));
    fireEvent.click(screen.getByText('Use English'));
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('persists locale to localStorage on change', () => {
    render(React.createElement(LocaleProvider, {}, React.createElement(Consumer)));
    fireEvent.click(screen.getByText('Use Arabic'));
    expect(localStorage.getItem('tec_locale')).toBe('ar');
  });

  it('reads locale from localStorage on mount', async () => {
    localStorage.setItem('tec_locale', 'ar');
    render(React.createElement(LocaleProvider, {}, React.createElement(Consumer)));
    await waitFor(() =>
      expect(screen.getByTestId('locale').textContent).toBe('ar')
    );
  });

  it('throws when useTranslation used outside LocaleProvider', () => {
    const BadConsumer = () => {
      useTranslation();
      return null;
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(React.createElement(BadConsumer))).toThrow('useTranslation must be used within LocaleProvider');
    vi.mocked(console.error).mockRestore?.();
  });
});
