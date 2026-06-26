'use client';

import { CountUp }         from '@yasser172/tec-ui';
import { useAssetsPage, getTokenFromCookie } from './hooks/useAssetsPage';
import { ErrorBoundary }   from '@/components/ErrorBoundary';
import { goToTEC }         from '@/lib/tec-navigation';
import { Skeleton }        from './components/Skeleton';
import { NFTUploadModal }  from './components/NFTUploadModal';
import { ListForSaleModal }   from './components/ListForSaleModal';
import { CancelConfirmModal } from './components/CancelConfirmModal';
import { TransferModal }      from './components/TransferModal';
import { AssetsTab }      from './components/AssetsTab';
import { MarketplaceTab } from './components/MarketplaceTab';
import { PurchasesTab }   from './components/PurchasesTab';
import { PortfolioTab }   from './components/PortfolioTab';
import { BottomNav }      from './components/BottomNav';
import { MainTab }        from './types';

function AssetsPageInner() {
  const s = useAssetsPage();

  const token = typeof window !== 'undefined' ? getTokenFromCookie() : null;
  if (s.isLoading || (!s.isAuthenticated && !token)) return <Skeleton />;

  const filtered      = s.assetFilter === 'all' ? s.assets : s.assets.filter(a =>
    a.asset_type === (s.assetFilter === 'domains' ? 'domain' : 'nft'));
  const totalValue    = s.assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);
  const displayBalance = s.settings.hideBalance ? '****'
    : s.wallet ? `${Number(s.wallet.balance).toFixed(2)} π` : '—';
  const displayTotal  = s.settings.hideBalance ? '****' : `${totalValue.toFixed(2)}`;

  return (
    <div style={{
      minHeight: '100vh', background: '#050816', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%,100%{opacity:.3}50%{opacity:.7} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:none} }
        .fade-in { animation: slideUp 0.4s ease; }
        .btn:active { transform: scale(0.97); }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {s.toast && (
        <div style={{
          position: 'fixed', top: 70, left: 16, right: 16, zIndex: 999,
          background: s.toast.type === 'success' ? '#051a0a' : '#1a0505',
          border: `1px solid ${s.toast.type === 'success' ? '#7ee7c040' : '#e74c3c40'}`,
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'toastIn 0.3s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontSize: 16 }}>{s.toast.type === 'success' ? '✅' : '❌'}</span>
          <span style={{ fontSize: 13, fontWeight: 600,
            color: s.toast.type === 'success' ? '#7ee7c0' : '#e74c3c' }}>
            {s.toast.msg}
          </span>
        </div>
      )}

      {s.mintingNFT && (
        <NFTUploadModal
          onClose={() => s.setMintingNFT(false)}
          onSuccess={() => { s.setMintingNFT(false); s.fetchData(); }}
        />
      )}

      {(s.listingAsset || s.editingListing) && (
        <ListForSaleModal
          asset={s.listingAsset ?? undefined}
          listing={s.editingListing ?? undefined}
          onClose={() => { s.setListingAsset(null); s.setEditingListing(null); }}
         onSuccess={() => { setTimeout(() => { s.fetchListings(); s.fetchData(); }, 1500); }} 
        />
      )}

      {s.cancellingListing && (
        <CancelConfirmModal
          listing={s.cancellingListing}
          onClose={() => s.setCancellingListing(null)}
          onConfirm={s.handleCancelConfirm}
          loading={s.cancelLoading}
        />
      )}

      {s.transferringAsset && (
        <TransferModal
          asset={s.transferringAsset}
          onClose={() => s.setTransferringAsset(null)}
          onSuccess={s.handleTransferSuccess}
        />
      )}

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
          <button className="btn" onClick={() => goToTEC('HUB')} style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
            padding: '6px 10px', color: '#FBBF24', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>🔷</span>
            <span style={{ fontSize: 8, color: '#4a4a5a', letterSpacing: 1 }}>HUB</span>
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#FBBF24', lineHeight: 1 }}>Assets</div>
            <div style={{ fontSize: 9, color: '#3a3a4a', letterSpacing: 2 }}>TEC ECOSYSTEM</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#FBBF24' }}>
            {s.user?.piUsername ? `@${s.user.piUsername}` : ''}
          </div>
          <button className="btn" onClick={() => s.router.push('/app/settings')} style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
            padding: '8px 12px', color: '#6b6b7a', fontSize: 14, cursor: 'pointer',
          }}>⚙️</button>
        </div>
      </header>

      {s.activeTab !== 'portfolio' && (
        <div style={{ padding: '16px 16px 0' }} className="fade-in">
          <div style={{
            borderRadius: 24, padding: '22px 24px',
            background: 'linear-gradient(135deg,rgba(26,18,8,0.9) 0%,rgba(15,15,26,0.9) 60%,rgba(10,15,31,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(251,191,36,0.15)',
          }}>
            <div style={{ fontSize: 10, color: '#4a4a5a', letterSpacing: 3,
              textTransform: 'uppercase', marginBottom: 8 }}>PORTFOLIO VALUE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              {s.dataLoading ? (
                <span style={{ fontSize: 36, fontWeight: 900, color: '#FBBF24', letterSpacing: -1 }}>—</span>
              ) : s.settings.hideBalance ? (
                <span style={{ fontSize: 36, fontWeight: 900, color: '#FBBF24', letterSpacing: -1 }}>****</span>
              ) : (
                <CountUp value={totalValue} decimals={2}
                  style={{ fontSize: 36, fontWeight: 900, color: '#FBBF24', letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }} />
              )}
              <span style={{ fontSize: 20, color: 'rgba(251,191,36,0.5)' }}>
                {s.settings.hideBalance ? '' : 'π'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Balance',   value: displayBalance },
                { label: 'Assets',    value: s.assets.length.toString() },
                { label: 'Purchases', value: s.purchases.length.toString() },
              ].map(st => (
                <div key={st.label} style={{
                  background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)',
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 4 }}>{st.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{st.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {([
          { key: 'assets',      label: '💎 My Assets'  },
          { key: 'marketplace', label: '🛒 Marketplace' },
          { key: 'purchases',   label: '🧾 History'     },
          { key: 'portfolio',   label: '📊 Portfolio'   },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => s.setActiveTab(tab.key as MainTab)} style={{
            padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            background: s.activeTab === tab.key ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(10px)',
            color:  s.activeTab === tab.key ? '#FBBF24' : '#4a4a5a',
            border: s.activeTab === tab.key ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {s.activeTab === 'assets' && (
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['all', 'domains', 'nfts'] as const).map(tab => (
            <button key={tab} onClick={() => s.setAssetFilter(tab)} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, letterSpacing: 1,
              textTransform: 'uppercase' as const,
              background: s.assetFilter === tab ? 'rgba(255,255,255,0.08)' : 'none',
              color:      s.assetFilter === tab ? '#fff' : '#3a3a4a',
              border:     s.assetFilter === tab ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
              {tab === 'all' ? 'All' : tab === 'domains' ? '🌐 Domains' : '🎨 NFTs'}
            </button>
          ))}
          <button onClick={() => s.setMintingNFT(true)} style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            background: 'rgba(123,107,200,0.08)',
            border: '1px solid rgba(123,107,200,0.25)',
            color: '#b39ddb', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ NFT</button>
        </div>
      )}

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {s.activeTab === 'assets' && (
          <AssetsTab
            assets={s.assets} filtered={filtered}
            dataLoading={s.dataLoading} showValues={s.settings.showValues}
            onListForSale={s.setListingAsset}
            onCancelListing={s.handleCancelFromAssets}
            onMintNFT={() => s.setMintingNFT(true)}
            onGoMarketplace={() => s.setActiveTab('marketplace')}
            onTransfer={s.handleTransfer}
            onRefresh={s.fetchData}
          />
        )}
        {s.activeTab === 'marketplace' && (
          <MarketplaceTab
            listings={s.listings}
            currentUserId={s.user?.id ?? ''}
            onBuy={s.handleBuy}
            onEditPrice={s.setEditingListing}
            onCancel={s.setCancellingListing}
            onGoAssets={() => s.setActiveTab('assets')}
          />
        )}
        {s.activeTab === 'purchases' && (
          <PurchasesTab
            purchases={s.purchases}
            onGoMarketplace={() => s.setActiveTab('marketplace')}
          />
        )}
        {s.activeTab === 'portfolio' && (
          <PortfolioTab
            assets={s.assets} wallet={s.wallet}
            showValues={s.settings.showValues}
            hideBalance={s.settings.hideBalance}
          />
        )}
      </div>

      <BottomNav
        activeTab={s.activeTab}
        setActiveTab={s.setActiveTab}
        setAssetFilter={s.setAssetFilter}
      />
    </div>
  );
}

export default function AssetsPage() {
  return <ErrorBoundary><AssetsPageInner /></ErrorBoundary>;
}
