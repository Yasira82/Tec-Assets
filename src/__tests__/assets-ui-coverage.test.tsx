import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// ── jose mock ─────────────────────────────────────────────────────────────────
vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({ payload: { sub: 'user-123' } }),
  SignJWT:   vi.fn().mockImplementation(function () {
    return {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setSubject:         vi.fn().mockReturnThis(),
      setIssuer:          vi.fn().mockReturnThis(),
      setAudience:        vi.fn().mockReturnThis(),
      setJti:             vi.fn().mockReturnThis(),
      setExpirationTime:  vi.fn().mockReturnThis(),
      setIssuedAt:        vi.fn().mockReturnThis(),
      sign:               vi.fn().mockResolvedValue('mock-token'),
    };
  }),
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter:   () => mockRouter,
  usePathname: () => '/',
}));

// ── dependency mocks ──────────────────────────────────────────────────────────
vi.mock('@/lib/tec-navigation',                 () => ({ goToTEC: vi.fn() }));
vi.mock('@/app/app/components/AssetImageViewer', () => ({ AssetImageViewer: () => null }));
vi.mock('@/app/app/components/AssetPreviewModal', () => ({ AssetPreviewModal: () => null }));
vi.mock('@/app/app/components/MarketplaceCard', () => ({
  MarketplaceCard: ({ listing }: { listing: { title: string; id: string } }) =>
    React.createElement('div', { 'data-testid': 'marketplace-card' }, listing.title),
}));

// ── fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockHeaders = { entries: () => new Map<string,string>().entries(), get: () => null };
const ok   = (data: unknown) => ({ ok: true,  status: 200, headers: mockHeaders, json: async () => data });
const fail = (s = 500)       => ({ ok: false, status: s,   headers: mockHeaders, json: async () => ({ error: 'fail' }), text: async () => 'error' });

// ── static imports (must be after vi.mock) ────────────────────────────────────
import { BottomNav }       from '@/app/app/components/BottomNav';
import { NFTTraits }       from '@/app/app/components/NFTTraits';
import { SimilarAssets }   from '@/app/app/components/SimilarAssets';
import { MarketplaceTab }  from '@/app/app/components/MarketplaceTab';
import { AssetCard }       from '@/app/app/components/AssetCard';
import { PortfolioTab }    from '@/app/app/components/PortfolioTab';
import { PurchasesTab }    from '@/app/app/components/PurchasesTab';
import HomePage            from '@/app/page';

import type { Asset, Listing, Purchase, WalletData } from '@/app/app/types';

// ── test data ─────────────────────────────────────────────────────────────────
const mockDomain: Asset = {
  id: 'a1', name: 'myname.pi', asset_type: 'domain',
  value: 5, currency: 'PI', status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  listing_id: null, listing_price: null,
};

const mockNFT: Asset = {
  id: 'a2', name: 'Cool NFT', asset_type: 'nft',
  value: 10, currency: 'PI', status: 'on_sale',
  created_at: '2026-01-01T00:00:00Z',
  listing_id: 'l1', listing_price: 10,
  metadata: { name: 'Cool NFT', imageUrl: 'https://img.test/nft.jpg' },
};

const mockListing: Listing = {
  id: 'l1', asset_id: 'a2', seller_id: 'seller-1',
  price: 10, currency: 'PI', status: 'ACTIVE',
  title: 'Cool NFT', description: 'desc', category: 'nft',
  created_at: '2026-01-01T00:00:00Z',
};

const mockPurchase: Purchase = {
  id: 'p1', assetId: 'a1', sellerId: 's1', buyerId: 'b1',
  price: 5, currency: 'PI', status: 'COMPLETED',
  soldAt: '2026-01-01T00:00:00Z',
  asset: { slug: 'myname.pi', category: 'DOMAIN', metadata: {} },
};

const mockWallet: WalletData = { balance: 12.5, currency: 'PI', walletId: 'w1' };

// ── helpers ───────────────────────────────────────────────────────────────────
const setCookie = (v: string) =>
  Object.defineProperty(document, 'cookie', { value: v, configurable: true, writable: true });

// Fake NextRequest-compatible object for route/middleware tests
const makeReq = (
  url: string,
  opts: { method?: string; body?: unknown; cookie?: string } = {},
) => {
  const cookieStr  = opts.cookie ?? '';
  const cookieMap: Record<string, string> = {};
  cookieStr.split(';').forEach(c => {
    const [k, ...vs] = c.trim().split('=');
    if (k) cookieMap[k.trim()] = vs.join('=');
  });
  const parsedUrl = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
  return {
    cookies: {
      get:    (name: string) => cookieMap[name] ? { value: cookieMap[name] } : undefined,
      getAll: () => Object.entries(cookieMap).map(([name, value]) => ({ name, value })),
    },
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'x-csrf-token') return cookieMap['tec_csrf'] ?? null;
        return null;
      },
    },
    url:     parsedUrl.href,
    nextUrl: { pathname: parsedUrl.pathname, searchParams: parsedUrl.searchParams },
    method:  opts.method ?? 'GET',
    json:    async () => opts.body ?? {},
    text:    async () => JSON.stringify(opts.body ?? {}),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(fail(503));
  setCookie('');
  process.env.API_GATEWAY_URL  = 'https://gw.test';
  process.env.JWT_SECRET       = 'jwt-test-secret';
  process.env.INTERNAL_SECRET  = 'internal-secret-test';
});

afterEach(() => cleanup());

// ─────────────────────────────────────────────────────────────────────────────
describe('BottomNav', () => {
  it('renders all 4 tabs', () => {
    const setTab    = vi.fn();
    const setFilter = vi.fn();
    render(<BottomNav activeTab="assets" setActiveTab={setTab} setAssetFilter={setFilter} />);
    expect(screen.getByText('Assets')).toBeTruthy();
    expect(screen.getByText('Market')).toBeTruthy();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('Portfolio')).toBeTruthy();
  });

  it('calls setActiveTab on click', () => {
    const setTab    = vi.fn();
    const setFilter = vi.fn();
    render(<BottomNav activeTab="assets" setActiveTab={setTab} setAssetFilter={setFilter} />);
    fireEvent.click(screen.getByText('Market'));
    expect(setTab).toHaveBeenCalledWith('marketplace');
  });

  it('highlights the active tab', () => {
    render(<BottomNav activeTab="portfolio" setActiveTab={vi.fn()} setAssetFilter={vi.fn()} />);
    expect(screen.getByText('Portfolio')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('NFTTraits', () => {
  const colors = { border: '#7b6bc840', status: '#b39ddb' };

  it('renders trait key-value pairs', () => {
    const meta = { rarity: 'Legendary', edition: '1/10', imageUrl: 'skip', name: 'skip', piPaymentId: 'skip' };
    render(<NFTTraits metadata={meta} colors={colors} />);
    expect(screen.getByText('rarity')).toBeTruthy();
    expect(screen.getByText('Legendary')).toBeTruthy();
    expect(screen.getByText('edition')).toBeTruthy();
    expect(screen.getByText('1/10')).toBeTruthy();
  });

  it('returns null when no traits after filtering', () => {
    const { container } = render(<NFTTraits metadata={{ imageUrl: 'x', name: 'y', piPaymentId: 'z' }} colors={colors} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Traits header when traits present', () => {
    render(<NFTTraits metadata={{ color: 'blue' }} colors={colors} />);
    expect(screen.getByText('Traits')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SimilarAssets', () => {
  const colors = { border: '#7b6bc840', status: '#b39ddb' };

  it('returns null when no similar assets', () => {
    const { container } = render(
      <SimilarAssets asset={mockDomain} allAssets={[mockDomain]} colors={colors} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders similar assets of same type', () => {
    const other: Asset = { ...mockDomain, id: 'a3', name: 'other.pi' };
    render(<SimilarAssets asset={mockDomain} allAssets={[mockDomain, other]} colors={colors} />);
    expect(screen.getByText('other.pi')).toBeTruthy();
    expect(screen.getByText('Similar Assets')).toBeTruthy();
  });

  it('shows listing price for priced assets', () => {
    const priced: Asset = { ...mockDomain, id: 'a3', name: 'priced.pi', listing_price: 7 };
    render(<SimilarAssets asset={mockDomain} allAssets={[mockDomain, priced]} colors={colors} />);
    expect(document.body.textContent).toContain('7');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('MarketplaceTab', () => {
  it('shows empty state when no listings', () => {
    render(<MarketplaceTab
      listings={[]} currentUserId="u1"
      onBuy={vi.fn()} onEditPrice={vi.fn()} onCancel={vi.fn()} onGoAssets={vi.fn()}
    />);
    expect(screen.getByText('No listings yet')).toBeTruthy();
    expect(screen.getByText('💎 My Assets')).toBeTruthy();
  });

  it('calls onGoAssets when button clicked on empty state', () => {
    const onGoAssets = vi.fn();
    render(<MarketplaceTab
      listings={[]} currentUserId="u1"
      onBuy={vi.fn()} onEditPrice={vi.fn()} onCancel={vi.fn()} onGoAssets={onGoAssets}
    />);
    fireEvent.click(screen.getByText('💎 My Assets'));
    expect(onGoAssets).toHaveBeenCalled();
  });

  it('renders marketplace cards when listings present', () => {
    render(<MarketplaceTab
      listings={[mockListing]} currentUserId="u1"
      onBuy={vi.fn()} onEditPrice={vi.fn()} onCancel={vi.fn()} onGoAssets={vi.fn()}
    />);
    expect(screen.getAllByTestId('marketplace-card').length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AssetCard', () => {
  const noop = vi.fn();

  it('renders a domain asset', () => {
    render(<AssetCard
      asset={mockDomain} showValues={true}
      onListForSale={noop} onCancelListing={noop}
    />);
    expect(screen.getByText('myname.pi')).toBeTruthy();
    expect(document.body.textContent).toContain('domain');
  });

  it('renders an NFT with on_sale status', () => {
    render(<AssetCard
      asset={mockNFT} showValues={true}
      onListForSale={noop} onCancelListing={noop}
    />);
    expect(document.body.textContent).toContain('ON SALE');
    expect(document.body.textContent).toContain('10');
  });

  it('renders Transfer button for active assets with onTransfer prop', () => {
    render(<AssetCard
      asset={mockDomain} showValues={true}
      onListForSale={noop} onCancelListing={noop} onTransfer={noop}
    />);
    expect(document.body.textContent).toContain('Transfer');
  });

  it('calls onTransfer when transfer button clicked', () => {
    const onTransfer = vi.fn();
    render(<AssetCard
      asset={mockDomain} showValues={true}
      onListForSale={noop} onCancelListing={noop} onTransfer={onTransfer}
    />);
    fireEvent.click(screen.getByTestId(`transfer-${mockDomain.id}`));
    expect(onTransfer).toHaveBeenCalledWith(mockDomain);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PortfolioTab', () => {
  it('renders total portfolio value', () => {
    render(<PortfolioTab
      assets={[mockDomain, mockNFT]} wallet={mockWallet}
      showValues={true} hideBalance={false}
    />);
    expect(screen.getByText('TOTAL PORTFOLIO')).toBeTruthy();
    expect(document.body.textContent).toContain('Pi Balance');
  });

  it('hides balance when hideBalance is true', () => {
    render(<PortfolioTab
      assets={[mockDomain]} wallet={mockWallet}
      showValues={true} hideBalance={true}
    />);
    expect(document.body.textContent).toContain('****');
  });

  it('shows asset breakdown', () => {
    render(<PortfolioTab
      assets={[mockDomain, mockNFT]} wallet={null}
      showValues={true} hideBalance={false}
    />);
    expect(screen.getByText('ASSET BREAKDOWN')).toBeTruthy();
    expect(screen.getByText('🌐 Domains')).toBeTruthy();
    expect(screen.getByText('🎨 NFTs')).toBeTruthy();
  });

  it('shows dashboard button', () => {
    render(<PortfolioTab
      assets={[]} wallet={null}
      showValues={false} hideBalance={false}
    />);
    expect(screen.getByText('🔷 View Full Dashboard')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PurchasesTab', () => {
  it('shows empty state with no purchases', () => {
    render(<PurchasesTab purchases={[]} onGoMarketplace={vi.fn()} />);
    expect(screen.getByText('No purchases yet')).toBeTruthy();
    expect(screen.getByText('🛒 Marketplace')).toBeTruthy();
  });

  it('calls onGoMarketplace when button clicked', () => {
    const onGo = vi.fn();
    render(<PurchasesTab purchases={[]} onGoMarketplace={onGo} />);
    fireEvent.click(screen.getByText('🛒 Marketplace'));
    expect(onGo).toHaveBeenCalled();
  });

  it('renders purchase cards', () => {
    render(<PurchasesTab purchases={[mockPurchase]} onGoMarketplace={vi.fn()} />);
    expect(document.body.textContent).toContain('myname.pi');
    expect(document.body.textContent).toContain('5');
  });

  it('renders NFT purchase as Minted', () => {
    const nftPurchase: Purchase = {
      ...mockPurchase,
      id: 'p2',
      asset: { slug: 'my-nft.pi', category: 'NFT', metadata: { imageUrl: 'https://img.test/nft.jpg' } },
      soldAt: '',
    };
    const withMint = { ...nftPurchase, isMint: true };
    render(<PurchasesTab purchases={[withMint as any]} onGoMarketplace={vi.fn()} />);
    expect(document.body.textContent).toContain('Minted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('HomePage', () => {
  it('renders the loading spinner', () => {
    render(<HomePage />);
    expect(document.body.textContent).toContain('Assets');
    expect(document.body.textContent).toContain('Connecting to TEC');
  });

  it('redirects to /app when token cookie exists', async () => {
    setCookie('tec_access_token=valid-token');
    render(<HomePage />);
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/app');
    });
  });

  it('redirects to Hub SSO when no token', async () => {
    setCookie('');
    const originalHref = Object.getOwnPropertyDescriptor(window, 'location');
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', { value: mockLocation, writable: true, configurable: true });
    render(<HomePage />);
    await waitFor(() => {
      expect(mockLocation.href).toContain('hub.tecosystem.app');
    });
    if (originalHref) Object.defineProperty(window, 'location', originalHref);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('health route', () => {
  it('returns online=false when API_GATEWAY_URL not configured', async () => {
    delete process.env.API_GATEWAY_URL;
    const { GET } = await import('@/app/api/health/route');
    const res  = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.online).toBe(false);
  });

  it('returns online=true when gateway is healthy', async () => {
    mockFetch.mockResolvedValue(ok({ status: 'ok' }));
    const { GET } = await import('@/app/api/health/route');
    const res  = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.online).toBe(true);
  });

  it('returns online=false when gateway is unhealthy', async () => {
    mockFetch.mockResolvedValue(fail(503));
    const { GET } = await import('@/app/api/health/route');
    const res  = await GET();
    const body = await res.json();
    expect(body.online).toBe(false);
    expect(body.error).toContain('503');
  });

  it('returns online=false on network error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const { GET } = await import('@/app/api/health/route');
    const res  = await GET();
    const body = await res.json();
    expect(body.online).toBe(false);
    expect(body.error).toContain('ECONNREFUSED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('middleware', () => {
  it('redirects unauthenticated request to protected route', async () => {
    const { middleware } = await import('@/middleware');
    const req = makeReq('http://localhost/app/dashboard');
    const res = middleware(req as any);
    expect([302, 307]).toContain(res.status);
  });

  it('allows authenticated request to protected route', async () => {
    const { middleware } = await import('@/middleware');
    const req = makeReq('http://localhost/app/dashboard', {
      cookie: 'tec_access_token=valid-tok',
    });
    const res = middleware(req as any);
    expect(res.status).toBe(200);
  });

  it('returns 403 on CSRF failure for protected API', async () => {
    const { middleware } = await import('@/middleware');
    // No tec_csrf cookie → csrfCookie undefined → CSRF check fails → 403
    const req = makeReq('http://localhost/api/bff/assets/transfer', {
      method: 'POST',
      cookie: 'tec_access_token=tok',
    });
    const res = middleware(req as any);
    expect(res.status).toBe(403);
  });

  it('passes CSRF check when header matches cookie', async () => {
    const { middleware } = await import('@/middleware');
    const req = {
      ...makeReq('http://localhost/api/bff/assets/transfer', {
        method: 'POST',
        cookie: 'tec_access_token=tok; tec_csrf=csrf-value',
      }),
      headers: {
        get: (name: string) => name.toLowerCase() === 'x-csrf-token' ? 'csrf-value' : null,
      },
    };
    const res = middleware(req as any);
    expect(res.status).toBe(200);
  });

  it('skips CSRF for CSRF-excluded paths', async () => {
    const { middleware } = await import('@/middleware');
    const req = makeReq('http://localhost/api/bff/marketplace/buy', {
      method: 'POST',
      cookie: 'tec_access_token=tok',
    });
    const res = middleware(req as any);
    expect(res.status).toBe(200);
  });

  it('allows safe methods without CSRF', async () => {
    const { middleware } = await import('@/middleware');
    const req = makeReq('http://localhost/api/bff/assets/list', {
      method: 'GET',
      cookie: 'tec_access_token=tok',
    });
    const res = middleware(req as any);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('nft/upload route', () => {
  it('returns 401 without access token', async () => {
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', { method: 'POST' });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', {
      method: 'POST', cookie: 'tec_access_token=valid-tok',
      body: { filename: 'test.jpg' }, // missing mimeType and data
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for disallowed MIME type', async () => {
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', {
      method: 'POST', cookie: 'tec_access_token=valid-tok',
      body: { filename: 'doc.pdf', mimeType: 'application/pdf', data: 'base64data' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('images');
  });

  it('returns 400 when file is too large', async () => {
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', {
      method: 'POST', cookie: 'tec_access_token=valid-tok',
      body: { filename: 'big.jpg', mimeType: 'image/jpeg', data: 'base64', size: 5 * 1024 * 1024 },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('4MB');
  });

  it('returns 500 when storage service fails', async () => {
    mockFetch.mockResolvedValue(fail(500));
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', {
      method: 'POST', cookie: 'tec_access_token=valid-tok',
      body: { filename: 'img.jpg', mimeType: 'image/jpeg', data: 'data:image/jpeg;base64,/9j/4AAQ==' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it('returns 500 when no uploadUrl returned', async () => {
    mockFetch.mockResolvedValueOnce(ok({ data: {} })); // no uploadUrl
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', {
      method: 'POST', cookie: 'tec_access_token=valid-tok',
      body: { filename: 'img.png', mimeType: 'image/png', data: 'data:image/png;base64,abc' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it('returns public URL on successful upload', async () => {
    mockFetch
      .mockResolvedValueOnce(ok({ data: { uploadUrl: 'https://r2.test/upload', key: 'nfts/img.jpg' } }))
      .mockResolvedValueOnce({ ok: true, status: 200, headers: mockHeaders });
    const { POST } = await import('@/app/api/bff/nft/upload/route');
    const req = makeReq('http://localhost/api/bff/nft/upload', {
      method: 'POST', cookie: 'tec_access_token=valid-tok',
      body: { filename: 'img.jpg', mimeType: 'image/jpeg', data: 'data:image/jpeg;base64,/9j/4AAQ==' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.publicUrl).toContain('nfts/img.jpg');
  });
});
