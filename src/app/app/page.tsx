'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }       from 'next/navigation';
import { usePiAuth }       from '@/lib-client/hooks/usePiAuth';
import { ErrorBoundary }   from '@/components/ErrorBoundary';
import { goToTEC }         from '@/lib/tec-navigation';
import { useSettings }     from '@/lib/hooks/useSettings';
import { GlobalNav }       from '@yasser172/tec-ui';

const SSO_URL =
  'https://tec-app-frontend.vercel.app/api/auth/sso?target=' +
  encodeURIComponent('https://tec-assets-app.vercel.app');

const TEC_PAY_URL = 'https://tec-app-frontend.vercel.app/pay';

// ── Types ─────────────────────────────────────────────────
interface Asset {
  id:         string;
  name:       string;
  asset_type: string;
  value:      number | string;
  currency:   string;
  status:     string;
  created_at: string;
}

interface Listing {
  id:          string;
  asset_id:    string;
  seller_id:   string;
  price:       number;
  currency:    string;
  status:      string;
  title:       string;
  description: string;
  category:    string;
  created_at:  string;
}

interface WalletData {
  balance:  number;
  currency: string;
  walletId: string | null;
}

type MainTab = 'assets' | 'portfolio' | 'marketplace';

// ── Helper ────────────────────────────────────────────────
const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('tec_access_token='));
  return match ? match.split('=')[1] : null;
};

// ── Asset Card ────────────────────────────────────────────
function AssetCard({
  asset,
  showValues,
  onListForSale,
}: {
  asset:         Asset;
  showValues:    boolean;
  onListForSale: (asset: Asset) => void;
}) {
  const typeEmoji: Record<string, string> = {
    domain:  '🌐',
    nft:     '🎨',
    token:   '🪙',
    default: '💎',
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
        {typeEmoji[asset.asset_type] ?? typeEmoji.default}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {asset.name}
        </div>
        <div style={{ fontSize: 11, color: '#4a4a5a', textTransform: 'uppercase', letterSpacing: 1 }}>
          {asset.asset_type}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 1,
          color: asset.status === 'active' ? '#7ee7c0' : '#6b6b7a',
        }}>
          {asset.status}
        </div>
        <button
          onClick={() => onListForSale(asset)}
          style={{
            padding: '5px 12px', borderRadius: 10,
            background: '#d4af3715', border: '1px solid #d4af3740',
            color: '#d4af37', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
          List for Sale
        </button>
      </div>
    </div>
  );
}

// ── List for Sale / Update Price Modal ────────────────────
function ListForSaleModal({
  asset,
  listing,
  onClose,
  onSuccess,
}: {
  asset?:    Asset;
  listing?:  Listing;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const isUpdate = !!listing;
  const [price,   setPrice]   = useState(isUpdate ? listing.price.toString() : '');
  const [desc,    setDesc]    = useState(isUpdate ? listing.description : '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { setError('Enter a valid price'); return; }

    setLoading(true);
    setError('');

    try {
      if (isUpdate) {
        const res = await fetch('/api/bff/marketplace/update-price', {
          method:      'PATCH',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id, price: p }),
        });
        if (!res.ok) { setError('Failed to update price'); return; }
      } else {
        const res = await fetch('/api/bff/marketplace/list', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId:     asset!.id,
            price:       p,
            title:       asset!.name,
            description: desc,
          }),
        });
        if (!res.ok) { setError('Failed to list asset'); return; }
      }

      onSuccess();
      onClose();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)', zIndex: 300,
        backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: '#0d0d14', borderTop: '1px solid #d4af3720',
        borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {isUpdate ? 'Update Price' : 'List for Sale'}
        </div>
        <div style={{ fontSize: 12, color: '#4a4a5a', marginBottom: 20 }}>
          {isUpdate ? listing.title : `${asset?.name} · ${asset?.asset_type}`}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>
            {isUpdate ? 'NEW PRICE (π)' : 'PRICE (π)'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#0a0a12', border: '1px solid #d4af3740',
            borderRadius: 14, padding: '12px 16px',
          }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: '#d4af37' }}>π</span>
            <input
              type="number" min="0.01" step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 18, fontWeight: 700,
              }}
            />
          </div>
        </div>

        {!isUpdate && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>
              DESCRIPTION (optional)
            </div>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe your asset..."
              rows={2}
              style={{
                width: '100%', background: '#0a0a12',
                border: '1px solid #ffffff10', borderRadius: 14,
                padding: '12px 16px', color: '#fff', fontSize: 13,
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !price}
          style={{
            width: '100%', padding: '16px',
            background: price ? 'linear-gradient(135deg,#d4af37,#b8882a)' : '#ffffff10',
            border: 'none', borderRadius: 16,
            color: price ? '#0a0800' : '#4a4a5a',
            fontSize: 15, fontWeight: 800,
            cursor: price ? 'pointer' : 'default',
          }}>
          {loading
            ? (isUpdate ? 'Updating...' : 'Listing...')
            : isUpdate
              ? `Update to ${price || '0'}π`
              : `List for ${price || '0'}π`}
        </button>

        <button onClick={onClose} style={{
          width: '100%', padding: '14px', marginTop: 10,
          background: 'none', border: '1px solid #ffffff10',
          borderRadius: 16, color: '#4a4a5a',
          fontSize: 14, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </>
  );
}

// ── Marketplace Card ──────────────────────────────────────
function MarketplaceCard({
  listing,
  currentUserId,
  onEditPrice,
}: {
  listing:       Listing;
  currentUserId: string;
  onEditPrice:   (listing: Listing) => void;
}) {
  const typeEmoji: Record<string, string> = {
    domain:  '🌐',
    nft:     '🎨',
    token:   '🪙',
    default: '💎',
  };

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
          <button onClick={() => onEditPrice(listing)} style={{
            padding: '5px 12px', borderRadius: 10,
            background: '#d4af3715', border: '1px solid #d4af3740',
            color: '#d4af37', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            Edit Price
          </button>
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

// ── Portfolio Tab ─────────────────────────────────────────
function PortfolioTab({
  assets, wallet, showValues, hideBalance,
}: {
  assets:      Asset[];
  wallet:      WalletData | null;
  showValues:  boolean;
  hideBalance: boolean;
}) {
  const totalValue  = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);
  const domainCount = assets.filter(a => a.asset_type === 'domain').length;
  const nftCount    = assets.filter(a => a.asset_type === 'nft').length;
  const tokenCount  = assets.filter(a => a.asset_type === 'token').length;
  const fmt = (v: string) => hideBalance ? '****' : v;

  return (
    <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        borderRadius: 20, padding: '20px',
        background: 'linear-gradient(135deg,#1a1208,#0d0d14)',
        border: '1px solid #d4af3720',
      }}>
        <div style={{ fontSize: 10, color: '#6b6b7a', letterSpacing: 3, marginBottom: 8 }}>
          TOTAL PORTFOLIO
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#d4af37', marginBottom: 16 }}>
          {fmt(`${totalValue.toFixed(2)} π`)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Pi Balance',   value: wallet ? fmt(`${Number(wallet.balance).toFixed(2)} π`) : '—' },
            { label: 'Assets Value', value: showValues ? fmt(`${totalValue.toFixed(2)} π`) : '****' },
          ].map(s => (
            <div key={s.label} style={{ background: '#ffffff05', borderRadius: 12, padding: '12px' }}>
              <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: 20, padding: '20px', background: '#0d0d14', border: '1px solid #ffffff08' }}>
        <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 12 }}>
          ASSET BREAKDOWN
        </div>
        {[
          { label: '🌐 Domains', count: domainCount },
          { label: '🎨 NFTs',    count: nftCount    },
          { label: '🪙 Tokens',  count: tokenCount  },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #ffffff05',
          }}>
            <span style={{ fontSize: 13, color: '#fff' }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#d4af37' }}>{item.count}</span>
          </div>
        ))}
      </div>
      <button onClick={() => goToTEC('DASHBOARD')} style={{
        padding: '14px', borderRadius: 16,
        background: 'linear-gradient(135deg,#d4af37,#b8882a)',
        border: 'none', color: '#0a0800',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
      }}>
        🔷 View Full Dashboard
      </button>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#020205', padding: '0 0 90px' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }
        .sk { animation: shimmer 1.4s ease infinite; background: #0d0d14; border-radius: 14px; }
      `}</style>
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <div className="sk" style={{ width: 80, height: 28 }} />
        <div className="sk" style={{ width: 36, height: 36, borderRadius: '50%' }} />
      </div>
      <div style={{ padding: '16px 16px 0' }}>
        <div className="sk" style={{ height: 110 }} />
      </div>
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="sk" style={{ height: 76 }} />)}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
function AssetsPageInner() {
  const { user, isAuthenticated, isLoading } = usePiAuth();
  const { settings, loaded }                 = useSettings();
  const router                               = useRouter();

  const [wallet,         setWallet]         = useState<WalletData | null>(null);
  const [assets,         setAssets]         = useState<Asset[]>([]);
  const [listings,       setListings]       = useState<Listing[]>([]);
  const [activeTab,      setActiveTab]      = useState<MainTab>('assets');
  const [assetFilter,    setAssetFilter]    = useState<'all' | 'domains' | 'nfts'>('all');
  const [dataLoading,    setDataLoading]    = useState(true);
  const [listingAsset,   setListingAsset]   = useState<Asset | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (settings.defaultTab === 'domains') {
      setActiveTab('assets');
      setAssetFilter('domains');
    } else if (settings.defaultTab === 'nfts') {
      setActiveTab('assets');
      setAssetFilter('nfts');
    }
  }, [loaded, settings.defaultTab]);

  useEffect(() => {
    if (isLoading) return;
    const token = getTokenFromCookie();
    if (!token && !isAuthenticated) {
      window.location.href = SSO_URL;
    }
  }, [isLoading, isAuthenticated]);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch('/api/bff/marketplace', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setListings(data?.listings ?? []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    const token = getTokenFromCookie();
    if (!token) return;
    setDataLoading(true);
    try {
      const [walletRes, assetsRes] = await Promise.all([
        fetch('/api/bff/wallet/balance', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/bff/assets/list',    { credentials: 'include', cache: 'no-store' }),
      ]);
      if (walletRes.ok) setWallet(await walletRes.json());
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data?.data ?? data?.assets ?? []);
      }
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { fetchData(); },    [fetchData]);
  useEffect(() => { fetchListings(); }, [fetchListings]);

  const token = typeof window !== 'undefined' ? getTokenFromCookie() : null;
  if (isLoading || (!isAuthenticated && !token)) return <Skeleton />;

  const filtered   = assetFilter === 'all'
    ? assets
    : assets.filter(a => a.asset_type === (assetFilter === 'domains' ? 'domain' : 'nft'));

  const totalValue = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);

  const displayBalance = settings.hideBalance
    ? '****'
    : wallet ? `${Number(wallet.balance).toFixed(2)} π` : '—';

  const displayTotal = settings.hideBalance ? '****' : `${totalValue.toFixed(2)}`;

  return (
    <div style={{
      minHeight: '100vh', background: '#020205', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      paddingBottom: 90,
    }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .fade-in { animation: slideUp 0.4s ease; }
        .btn:active { transform: scale(0.97); }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Modals ── */}
      {(listingAsset || editingListing) && (
        <ListForSaleModal
          asset={listingAsset ?? undefined}
          listing={editingListing ?? undefined}
          onClose={() => { setListingAsset(null); setEditingListing(null); }}
          onSuccess={() => { fetchListings(); fetchData(); }}
        />
      )}

      {/* ── Header ── */}
      <header style={{
        padding: '14px 20px', borderBottom: '1px solid #ffffff08',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'rgba(2,2,5,0.95)',
        backdropFilter: 'blur(20px)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={() => goToTEC('HUB')}
            style={{
              background: '#ffffff08', border: '1px solid #ffffff10',
              borderRadius: 10, padding: '6px 10px',
              color: '#d4af37', fontSize: 16, cursor: 'pointer',
            }}>
            🔷
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#d4af37', lineHeight: 1 }}>Assets</div>
            <div style={{ fontSize: 9, color: '#4a4a5a', letterSpacing: 2 }}>TEC ECOSYSTEM</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#d4af37' }}>
            {user?.piUsername ? `@${user.piUsername}` : ''}
          </div>
          <button className="btn" onClick={() => router.push('/app/settings')}
            style={{
              background: '#ffffff08', border: '1px solid #ffffff10',
              borderRadius: 10, padding: '6px 10px',
              color: '#6b6b7a', fontSize: 14, cursor: 'pointer',
            }}>
            ⚙️
          </button>
        </div>
      </header>

      {/* ── Portfolio Card ── */}
      {activeTab !== 'portfolio' && (
        <div style={{ padding: '16px 16px 0' }} className="fade-in">
          <div style={{
            borderRadius: 24, padding: '22px 24px',
            background: 'linear-gradient(135deg,#1a1208 0%,#0f0f1a 60%,#0a0f1f 100%)',
            border: '1px solid #d4af3725',
          }}>
            <div style={{ fontSize: 10, color: '#6b6b7a', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              PORTFOLIO VALUE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: '#d4af37', letterSpacing: -1 }}>
                {dataLoading ? '—' : displayTotal}
              </span>
              <span style={{ fontSize: 20, color: '#d4af3780' }}>
                {settings.hideBalance ? '' : 'π'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Balance', value: displayBalance },
                { label: 'Assets',  value: assets.length.toString() },
                { label: 'Domains', value: assets.filter(a => a.asset_type === 'domain').length.toString() },
              ].map(s => (
                <div key={s.label} style={{ background: '#ffffff05', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {([
          { key: 'assets',      label: '💎 My Assets'  },
          { key: 'marketplace', label: '🛒 Marketplace' },
          { key: 'portfolio',   label: '📊 Portfolio'   },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              background: activeTab === tab.key ? '#d4af3720' : '#ffffff08',
              color:      activeTab === tab.key ? '#d4af37'   : '#6b6b7a',
              border:     activeTab === tab.key ? '1px solid #d4af3740' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Asset Filter ── */}
      {activeTab === 'assets' && (
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8 }}>
          {(['all', 'domains', 'nfts'] as const).map(tab => (
            <button key={tab} onClick={() => setAssetFilter(tab)}
              style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                fontSize: 11, fontWeight: 600, letterSpacing: 1,
                textTransform: 'uppercase' as const,
                background: assetFilter === tab ? '#ffffff12' : 'none',
                color:      assetFilter === tab ? '#fff'      : '#4a4a5a',
                border:     assetFilter === tab ? '1px solid #ffffff20' : '1px solid transparent',
                transition: 'all 0.2s',
              }}>
              {tab === 'all' ? 'All' : tab === 'domains' ? '🌐 Domains' : '🎨 NFTs'}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* My Assets */}
        {activeTab === 'assets' && (
          dataLoading ? (
            [1,2,3].map(i => (
              <div key={i} style={{
                height: 76, background: '#0d0d14', borderRadius: 18,
                animation: 'shimmer 1.4s ease infinite',
              }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, color: '#4a4a5a' }}>No assets yet</div>
              <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
                Browse the Marketplace to find assets
              </div>
              <button onClick={() => setActiveTab('marketplace')}
                style={{
                  marginTop: 20, padding: '12px 24px',
                  background: 'linear-gradient(135deg,#d4af37,#b8882a)',
                  border: 'none', borderRadius: 14,
                  color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                🛒 Browse Marketplace
              </button>
            </div>
          ) : (
            filtered.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                showValues={settings.showValues}
                onListForSale={setListingAsset}
              />
            ))
          )
        )}

        {/* Marketplace */}
        {activeTab === 'marketplace' && (
          listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div style={{ fontSize: 15, color: '#4a4a5a' }}>No listings yet</div>
              <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
                Be the first to list an asset for sale
              </div>
              <button onClick={() => setActiveTab('assets')}
                style={{
                  marginTop: 20, padding: '12px 24px',
                  background: 'linear-gradient(135deg,#d4af37,#b8882a)',
                  border: 'none', borderRadius: 14,
                  color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                💎 My Assets
              </button>
            </div>
          ) : (
            listings.map(listing => (
              <MarketplaceCard
                key={listing.id}
                listing={listing}
                currentUserId={user?.id ?? ''}
                onEditPrice={setEditingListing}
              />
            ))
          )
        )}

        {/* Portfolio */}
        {activeTab === 'portfolio' && (
          <PortfolioTab
            assets={assets}
            wallet={wallet}
            showValues={settings.showValues}
            hideBalance={settings.hideBalance}
          />
        )}

      </div>

      {/* ── Bottom Nav ── */}
      <GlobalNav
        currentApp="assets"
        items={[
          {
            icon:   '💎',
            label:  'Assets',
            app:    'assets',
            action: () => { setActiveTab('assets'); setAssetFilter('all'); },
          },
          {
            icon:   '🛒',
            label:  'Market',
            app:    null,
            action: () => setActiveTab('marketplace'),
          },
          {
            icon:   '📊',
            label:  'Portfolio',
            app:    null,
            action: () => setActiveTab('portfolio'),
          },
          {
            icon:   '⚙️',
            label:  'Settings',
            app:    'settings',
            action: () => router.push('/app/settings'),
          },
          {
            icon:   '🔷',
            label:  'TEC Hub',
            app:    null,
            action: () => goToTEC('HUB'),
          },
        ]}
      />
    </div>
  );
}

export default function AssetsPage() {
  return (
    <ErrorBoundary>
      <AssetsPageInner />
    </ErrorBoundary>
  );
}
