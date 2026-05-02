'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }                        from 'next/navigation';
import { usePiAuth }                        from '@/lib-client/hooks/usePiAuth';
import { ErrorBoundary }                    from '@/components/ErrorBoundary';
import { goToTEC }                          from '@/lib/tec-navigation';
import { useSettings }                      from '@/lib/hooks/useSettings';
import { Asset, Listing, WalletData, MainTab, Purchase } from './types';
import { ListForSaleModal }   from './components/ListForSaleModal';
import { CancelConfirmModal } from './components/CancelConfirmModal';
import { PortfolioTab }       from './components/PortfolioTab';
import { Skeleton }           from './components/Skeleton';
import { NFTUploadModal }     from './components/NFTUploadModal';
import { AssetsTab }          from './components/AssetsTab';
import { MarketplaceTab }     from './components/MarketplaceTab';
import { PurchasesTab }       from './components/PurchasesTab';

const SSO_URL = 'https://tec-app-frontend.vercel.app/api/auth/sso?target=' +
  encodeURIComponent('https://tec-assets-app.vercel.app');

const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(row => row.startsWith('tec_access_token='));
  return match ? match.split('=')[1] : null;
};

// ── Bottom Nav ────────────────────────────────────────────
const BottomNav = ({
  activeTab, setActiveTab, setAssetFilter,
}: {
  activeTab:      MainTab;
  setActiveTab:   (tab: MainTab) => void;
  setAssetFilter: (f: 'all' | 'domains' | 'nfts') => void;
}) => {
  const items = [
    { key: 'assets',      icon: '💎', label: 'Assets'    },
    { key: 'marketplace', icon: '🛒', label: 'Market'    },
    { key: 'purchases',   icon: '🧾', label: 'History'   },
    { key: 'portfolio',   icon: '📊', label: 'Portfolio' },
  ] as const;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(2,2,5,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {items.map(item => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => {
              navigator.vibrate?.(8);
              if (item.key === 'assets') setAssetFilter('all');
              setActiveTab(item.key);
            }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 0 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{
              fontSize: 20,
              filter: isActive ? 'none' : 'grayscale(1) opacity(0.4)',
              transition: 'filter 0.2s, transform 0.2s',
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
            }}>
              {item.icon}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              color: isActive ? '#d4af37' : '#3a3a4a',
              transition: 'color 0.2s',
            }}>
              {item.label}
            </div>
            {isActive && (
              <div style={{
                position: 'absolute', bottom: 0,
                width: 20, height: 2, borderRadius: 1,
                background: '#d4af37',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

function AssetsPageInner() {
  const { user, isAuthenticated, isLoading } = usePiAuth();
  const { settings, loaded }                 = useSettings();
  const router                               = useRouter();

  const [wallet,            setWallet]            = useState<WalletData | null>(null);
  const [assets,            setAssets]            = useState<Asset[]>([]);
  const [listings,          setListings]          = useState<Listing[]>([]);
  const [purchases,         setPurchases]         = useState<Purchase[]>([]);
  const [activeTab,         setActiveTab]         = useState<MainTab>('assets');
  const [assetFilter,       setAssetFilter]       = useState<'all' | 'domains' | 'nfts'>('all');
  const [dataLoading,       setDataLoading]       = useState(true);
  const [listingAsset,      setListingAsset]      = useState<Asset | null>(null);
  const [editingListing,    setEditingListing]    = useState<Listing | null>(null);
  const [cancellingListing, setCancellingListing] = useState<Listing | null>(null);
  const [cancelLoading,     setCancelLoading]     = useState(false);
  const [mintingNFT,        setMintingNFT]        = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (settings.defaultTab === 'domains') { setActiveTab('assets'); setAssetFilter('domains'); }
    else if (settings.defaultTab === 'nfts') { setActiveTab('assets'); setAssetFilter('nfts'); }
  }, [loaded, settings.defaultTab]);

  useEffect(() => {
    if (isLoading) return;
    const token = getTokenFromCookie();
    if (!token && !isAuthenticated) window.location.href = SSO_URL;
  }, [isLoading, isAuthenticated]);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch('/api/bff/marketplace', { credentials: 'include', cache: 'no-store' });
      if (res.ok) { const data = await res.json(); setListings(data?.listings ?? []); }
    } catch { /* silent */ }
  }, []);

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/bff/marketplace/purchases', { credentials: 'include', cache: 'no-store' });
      if (res.ok) { const data = await res.json(); setPurchases(data?.purchases ?? []); }
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
      if (assetsRes.ok) { const data = await assetsRes.json(); setAssets(data?.data ?? []); }
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingListing) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/bff/marketplace/cancel', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: cancellingListing.id }),
      });
      if (res.ok) { fetchListings(); fetchData(); }
    } catch { /* silent */ }
    finally { setCancelLoading(false); setCancellingListing(null); }
  }, [cancellingListing, fetchListings, fetchData]);

  const handleCancelFromAssets = useCallback((listingId: string) => {
    setCancellingListing({
      id: listingId, asset_id: '', seller_id: '', price: 0,
      currency: 'PI', status: 'ACTIVE', title: 'this listing',
      description: '', category: '', created_at: '',
    });
  }, []);

  useEffect(() => { fetchData(); },      [fetchData]);
  useEffect(() => { fetchListings(); },  [fetchListings]);
  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const token = typeof window !== 'undefined' ? getTokenFromCookie() : null;
  if (isLoading || (!isAuthenticated && !token)) return <Skeleton />;

  const filtered     = assetFilter === 'all' ? assets : assets.filter(a =>
    a.asset_type === (assetFilter === 'domains' ? 'domain' : 'nft'));
  const totalValue   = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);
  const displayBalance = settings.hideBalance ? '****' : wallet ? `${Number(wallet.balance).toFixed(2)} π` : '—';
  const displayTotal   = settings.hideBalance ? '****' : `${totalValue.toFixed(2)}`;

  return (
    <div style={{
      minHeight: '100vh', background: '#020205', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%,100%{opacity:.3}50%{opacity:.7} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .fade-in { animation: slideUp 0.4s ease; }
        .btn:active { transform: scale(0.97); }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Modals ── */}
      {mintingNFT && <NFTUploadModal onClose={() => setMintingNFT(false)} />}

      {(listingAsset || editingListing) && (
        <ListForSaleModal
          asset={listingAsset ?? undefined}
          listing={editingListing ?? undefined}
          onClose={() => { setListingAsset(null); setEditingListing(null); }}
          onSuccess={() => { fetchListings(); fetchData(); }}
        />
      )}

      {cancellingListing && (
        <CancelConfirmModal
          listing={cancellingListing}
          onClose={() => setCancellingListing(null)}
          onConfirm={handleCancelConfirm}
          loading={cancelLoading}
        />
      )}

      {/* ── Header ── */}
      <header style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0,
        background: 'rgba(2,2,5,0.92)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
  className="btn"
  onClick={() => goToTEC('HUB')}
  style={{
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '6px 10px',
    color: '#d4af37', cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2,
  }}
>
  <span style={{ fontSize: 16 }}>🔷</span>
  <span style={{ fontSize: 8, color: '#4a4a5a', letterSpacing: 1 }}>HUB</span>
</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#d4af37', lineHeight: 1 }}>Assets</div>
            <div style={{ fontSize: 9, color: '#3a3a4a', letterSpacing: 2 }}>TEC ECOSYSTEM</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#d4af37' }}>
            {user?.piUsername ? `@${user.piUsername}` : ''}
          </div>
          <button
            className="btn"
            onClick={() => router.push('/app/settings')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '8px 12px',
              color: '#6b6b7a', fontSize: 14, cursor: 'pointer',
            }}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ── Portfolio Card ── */}
      {activeTab !== 'portfolio' && (
        <div style={{ padding: '16px 16px 0' }} className="fade-in">
          <div style={{
            borderRadius: 24, padding: '22px 24px',
            background: 'linear-gradient(135deg,rgba(26,18,8,0.9) 0%,rgba(15,15,26,0.9) 60%,rgba(10,15,31,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}>
            <div style={{ fontSize: 10, color: '#4a4a5a', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              PORTFOLIO VALUE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: '#d4af37', letterSpacing: -1 }}>
                {dataLoading ? '—' : displayTotal}
              </span>
              <span style={{ fontSize: 20, color: 'rgba(212,175,55,0.5)' }}>
                {settings.hideBalance ? '' : 'π'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Balance',   value: displayBalance },
                { label: 'Assets',    value: assets.length.toString() },
                { label: 'Purchases', value: purchases.length.toString() },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {([
          { key: 'assets',      label: '💎 My Assets'  },
          { key: 'marketplace', label: '🛒 Marketplace' },
          { key: 'purchases',   label: '🧾 History'     },
          { key: 'portfolio',   label: '📊 Portfolio'   },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            background: activeTab === tab.key
              ? 'rgba(212,175,55,0.12)'
              : 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(10px)',
            color:  activeTab === tab.key ? '#d4af37' : '#4a4a5a',
            border: activeTab === tab.key ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Asset Filter ── */}
      {activeTab === 'assets' && (
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['all', 'domains', 'nfts'] as const).map(tab => (
            <button key={tab} onClick={() => setAssetFilter(tab)} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, letterSpacing: 1,
              textTransform: 'uppercase' as const,
              background: assetFilter === tab ? 'rgba(255,255,255,0.08)' : 'none',
              color:      assetFilter === tab ? '#fff' : '#3a3a4a',
              border:     assetFilter === tab ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
              {tab === 'all' ? 'All' : tab === 'domains' ? '🌐 Domains' : '🎨 NFTs'}
            </button>
          ))}
          <button onClick={() => setMintingNFT(true)} style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            background: 'rgba(123,107,200,0.08)',
            border: '1px solid rgba(123,107,200,0.25)',
            color: '#b39ddb', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            + NFT
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activeTab === 'assets' && (
          <AssetsTab
            assets={assets}
            filtered={filtered}
            dataLoading={dataLoading}
            showValues={settings.showValues}
            onListForSale={setListingAsset}
            onCancelListing={handleCancelFromAssets}
            onMintNFT={() => setMintingNFT(true)}
            onGoMarketplace={() => setActiveTab('marketplace')}
          />
        )}
        {activeTab === 'marketplace' && (
          <MarketplaceTab
            listings={listings}
            currentUserId={user?.id ?? ''}
            onEditPrice={setEditingListing}
            onCancel={setCancellingListing}
            onGoAssets={() => setActiveTab('assets')}
          />
        )}
        {activeTab === 'purchases' && (
          <PurchasesTab
            purchases={purchases}
            onGoMarketplace={() => setActiveTab('marketplace')}
          />
        )}
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
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setAssetFilter={setAssetFilter}
      />
    </div>
  );
}

export default function AssetsPage() {
  return <ErrorBoundary><AssetsPageInner /></ErrorBoundary>;
}
