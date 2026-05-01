'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }                        from 'next/navigation';
import { usePiAuth }                        from '@/lib-client/hooks/usePiAuth';
import { ErrorBoundary }                    from '@/components/ErrorBoundary';
import { goToTEC }                          from '@/lib/tec-navigation';
import { useSettings }                      from '@/lib/hooks/useSettings';
import { GlobalNav }                        from '@yasser172/tec-ui';
import { Asset, Listing, WalletData, MainTab } from './types';
import { AssetCard }          from './components/AssetCard';
import { MarketplaceCard }    from './components/MarketplaceCard';
import { ListForSaleModal }   from './components/ListForSaleModal';
import { CancelConfirmModal } from './components/CancelConfirmModal';
import { PortfolioTab }       from './components/PortfolioTab';
import { Skeleton }           from './components/Skeleton';
import { NFTUploadModal }     from './components/NFTUploadModal';

const SSO_URL = 'https://tec-app-frontend.vercel.app/api/auth/sso?target=' +
  encodeURIComponent('https://tec-assets-app.vercel.app');

const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(row => row.startsWith('tec_access_token='));
  return match ? match.split('=')[1] : null;
};

function AssetsPageInner() {
  const { user, isAuthenticated, isLoading } = usePiAuth();
  const { settings, loaded }                 = useSettings();
  const router                               = useRouter();

  const [wallet,            setWallet]            = useState<WalletData | null>(null);
  const [assets,            setAssets]            = useState<Asset[]>([]);
  const [listings,          setListings]          = useState<Listing[]>([]);
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
      // ✅ debug
      console.log('[Assets] data:', JSON.stringify(data?.data?.slice(0, 1)));
      setAssets(data?.data ?? []);
    }
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

  useEffect(() => { fetchData(); },     [fetchData]);
  useEffect(() => { fetchListings(); }, [fetchListings]);

  const token = typeof window !== 'undefined' ? getTokenFromCookie() : null;
  if (isLoading || (!isAuthenticated && !token)) return <Skeleton />;

  const filtered       = assetFilter === 'all' ? assets : assets.filter(a => a.asset_type === (assetFilter === 'domains' ? 'domain' : 'nft'));
  const totalValue     = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);
  const displayBalance = settings.hideBalance ? '****' : wallet ? `${Number(wallet.balance).toFixed(2)} π` : '—';
  const displayTotal   = settings.hideBalance ? '****' : `${totalValue.toFixed(2)}`;

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
      {mintingNFT && (
        <NFTUploadModal onClose={() => setMintingNFT(false)} />
      )}

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
        padding: '14px 20px', borderBottom: '1px solid #ffffff08',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'rgba(2,2,5,0.95)',
        backdropFilter: 'blur(20px)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={() => goToTEC('HUB')} style={{
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
          <button className="btn" onClick={() => router.push('/app/settings')} style={{
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
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
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

      {/* ── Asset Filter + NFT ── */}
      {activeTab === 'assets' && (
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['all', 'domains', 'nfts'] as const).map(tab => (
            <button key={tab} onClick={() => setAssetFilter(tab)} style={{
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

          {/* ✅ NFT Mint */}
          <button onClick={() => setMintingNFT(true)} style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            background: '#7b6bc815', border: '1px solid #7b6bc840',
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
                Mint an NFT or browse the Marketplace
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                <button onClick={() => setMintingNFT(true)} style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg,#2d1b69,#1a0f3d)',
                  border: '1px solid #7b6bc840', borderRadius: 14,
                  color: '#b39ddb', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  🎨 Mint NFT
                </button>
                <button onClick={() => setActiveTab('marketplace')} style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg,#d4af37,#b8882a)',
                  border: 'none', borderRadius: 14,
                  color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  🛒 Marketplace
                </button>
              </div>
            </div>
          ) : (
            filtered.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                showValues={settings.showValues}
                onListForSale={setListingAsset}
                onCancelListing={handleCancelFromAssets}
              />
            ))
          )
        )}

        {activeTab === 'marketplace' && (
          listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div style={{ fontSize: 15, color: '#4a4a5a' }}>No listings yet</div>
              <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
                Be the first to list an asset for sale
              </div>
              <button onClick={() => setActiveTab('assets')} style={{
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
                onCancel={setCancellingListing}
              />
            ))
          )
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
      <GlobalNav
        currentApp="assets"
        items={[
          { icon: '💎', label: 'Assets',    app: 'assets',   action: () => { setActiveTab('assets'); setAssetFilter('all'); } },
          { icon: '🛒', label: 'Market',    app: null,       action: () => setActiveTab('marketplace') },
          { icon: '📊', label: 'Portfolio', app: null,       action: () => setActiveTab('portfolio') },
          { icon: '⚙️', label: 'Settings',  app: 'settings', action: () => router.push('/app/settings') },
          { icon: '🔷', label: 'TEC Hub',   app: null,       action: () => goToTEC('HUB') },
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
