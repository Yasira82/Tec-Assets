'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter }                        from 'next/navigation';
import { usePiAuth }                        from '@/lib-client/hooks/usePiAuth';
import { ErrorBoundary }                    from '@/components/ErrorBoundary';
import { goToTEC }                          from '@/lib/tec-navigation';
import { useSettings }                      from '@/lib/hooks/useSettings';
import { createPaymentRecord, createU2APayment, PaymentResult } from '@/lib/pi-payment';
import { Asset, Listing, WalletData, MainTab, Purchase } from './types';
import { ListForSaleModal }   from './components/ListForSaleModal';
import { CancelConfirmModal } from './components/CancelConfirmModal';
import { PortfolioTab }       from './components/PortfolioTab';
import { Skeleton }           from './components/Skeleton';
import { NFTUploadModal }     from './components/NFTUploadModal';
import { AssetsTab }          from './components/AssetsTab';
import { MarketplaceTab }     from './components/MarketplaceTab';
import { PurchasesTab }       from './components/PurchasesTab';
import { TransferModal }      from './components/TransferModal';

const HUB_URL    = process.env.NEXT_PUBLIC_HUB_URL    ?? 'https://hub.tecosystem.app';
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? 'https://assets.tecosystem.app';
const SSO_URL    = `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(ASSETS_URL)}`;

type PayStatus = 'idle' | 'creating' | 'paying' | 'success' | 'cancelled' | 'error';

const getCsrfToken = (): string =>
  typeof document === 'undefined' ? '' :
  document.cookie.split('; ').find(r => r.startsWith('tec_csrf='))?.split('=')?.[1] ?? '';

const getTokenFromCookie = (): string | null =>
  typeof document === 'undefined' ? null :
  document.cookie.split('; ').find(row => row.startsWith('tec_access_token='))?.split('=')?.[1] ?? null;

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
      background: 'rgba(2,2,5,0.92)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {items.map(item => {
        const isActive = activeTab === item.key;
        return (
          <button key={item.key}
            onClick={() => { navigator.vibrate?.(8); if (item.key === 'assets') setAssetFilter('all'); setActiveTab(item.key); }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 0 12px', background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}>
            <div style={{ fontSize: 20, filter: isActive ? 'none' : 'grayscale(1) opacity(0.4)', transition: 'filter 0.2s, transform 0.2s', transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
              {item.icon}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: isActive ? '#d4af37' : '#3a3a4a', transition: 'color 0.2s' }}>
              {item.label}
            </div>
            {isActive && <div style={{ position: 'absolute', bottom: 0, width: 20, height: 2, borderRadius: 1, background: '#d4af37' }} />}
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
  const [transferringAsset, setTransferringAsset] = useState<Asset | null>(null);
  const [toast,             setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Payment state ✅ ──────────────────────────────────────
  const [piReady,     setPiReady]     = useState(false);
  const [payStatus,   setPayStatus]   = useState<PayStatus>('idle');
  const [payMessage,  setPayMessage]  = useState('');
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const inFlight = useRef(false);

  // ── Pi SDK ready ✅ ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__TEC_PI_READY) { setPiReady(true); return; }
    const h = () => setPiReady(true);
    window.addEventListener('tec-pi-ready', h, { once: true });
    return () => window.removeEventListener('tec-pi-ready', h);
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (settings.defaultTab === 'domains')      { setActiveTab('assets'); setAssetFilter('domains'); }
    else if (settings.defaultTab === 'nfts')    { setActiveTab('assets'); setAssetFilter('nfts'); }
  }, [loaded, settings.defaultTab]);

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

  useEffect(() => {
    if (isLoading) return;
    const token = getTokenFromCookie();
    if (!token && !isAuthenticated) { window.location.href = SSO_URL; return; }

    const params        = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');

    if (paymentStatus === 'success') {
      const txid      = params.get('txid')       ?? '';
      const paymentId = params.get('payment_id') ?? '';
      const productId = params.get('product_id') ?? '';

      if (productId.startsWith('nft:')) {
        try {
          const nftMeta = JSON.parse(atob(productId.slice(4)));
          showToast('NFT Minted! 🎨');
          setActiveTab('assets');
          fetch('/api/bff/nft/register', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
            body: JSON.stringify({ name: nftMeta.n, description: nftMeta.d ?? '', imageUrl: nftMeta.u, key: nftMeta.k, mimeType: nftMeta.m, paymentId, txid }),
          })
            .then(async (res) => {
  const data = await res.json().catch(() => ({})) as { error?: string };
  if (res.ok) {
    await new Promise(r => setTimeout(r, 3000));
    fetchData();
    // ✅ retry بعد 4 ثواني تانية لو الـ gateway cache
    setTimeout(() => fetchData(), 4000);
  } else {
    showToast(`Register failed: ${data.error ?? res.status}`, 'error');
  }
})
.catch(() => { showToast('Register failed', 'error'); });
        } catch { showToast('NFT data error', 'error'); }
      } else {
        showToast('Purchase successful! 🎉');
        setActiveTab('purchases');
        if (productId && paymentId) {
          fetch('/api/bff/marketplace/buy', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
            body: JSON.stringify({ listing_id: productId, payment_id: paymentId, txid }),
          }).then(() => { fetchPurchases(); fetchData(); }).catch(() => {});
        }
      }
      window.history.replaceState({}, '', '/app');
    }
  }, [isLoading, isAuthenticated, showToast, fetchPurchases, fetchData]);

  // ── handleBuy ✅ ──────────────────────────────────────────
  const handleBuy = useCallback(async (listing: Listing) => {
    if (!window.Pi) { showToast('Open in Pi Browser to pay', 'error'); return; }
    if (!piReady)   { showToast('Pi SDK still loading...', 'error'); return; }
    if (inFlight.current) return;

    const amount = listing.price;

    // ✅ اختبر Pi SDK — لو Hub's session → Hub PaymentModal
    const piWorks = await (async () => {
      try { await window.Pi.authenticate(['username'], () => {}); return true; }
      catch { return false; }
    })();

    if (!piWorks) {
      const params = new URLSearchParams({
        pay:        '1',
        amount:     String(amount),
        memo:       `Buy ${listing.title} — TEC Assets`,
        product_id: listing.id,
        source:     'assets',
        return_url: `${ASSETS_URL}/app`,
      });
      window.location.href = `${HUB_URL}/hub?${params}`;
      return;
    }

    // ✅ Assets Direct Payment
    inFlight.current = true;
    setActiveListing(listing);
    setPayStatus('creating');
    setPayMessage('');

    try {
      const memo       = `Buy ${listing.title} — TEC Assets`;
      const internalId = await createPaymentRecord(amount, listing.id, memo);

      if (!internalId) {
        setPayStatus('error');
        setPayMessage('Failed to initialize payment.');
        inFlight.current = false;
        return;
      }

      setPayStatus('paying');

      const result = await createU2APayment(
        amount, memo,
        { source: 'assets', listing_id: listing.id },
        internalId,
      );

      if (result.success) {
        fetch('/api/bff/marketplace/buy', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
          body: JSON.stringify({ listing_id: listing.id, payment_id: internalId }),
        }).then(() => { fetchPurchases(); fetchData(); }).catch(() => {});
        setPayStatus('success');
        showToast('Purchase successful! 🎉');
        setTimeout(() => { setActiveTab('purchases'); }, 1500);
      } else {
        setPayStatus(result.status === 'cancelled' ? 'cancelled' : 'error');
        setPayMessage(result.message ?? '');
      }
    } catch (err) {
      setPayStatus('error');
      setPayMessage(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      inFlight.current = false;
    }
  }, [showToast, fetchPurchases, fetchData, piReady]);

  const closePayModal = () => {
    setPayStatus('idle');
    setActiveListing(null);
    setPayMessage('');
    inFlight.current = false;
  };

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingListing) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/bff/marketplace/cancel', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ listingId: cancellingListing.id }),
      });
      if (res.ok) { fetchListings(); fetchData(); }
    } catch { /* silent */ }
    finally { setCancelLoading(false); setCancellingListing(null); }
  }, [cancellingListing, fetchListings, fetchData]);

  const handleTransfer = useCallback((asset: Asset) => { setTransferringAsset(asset); }, []);
  const handleTransferSuccess = useCallback(() => {
    setTransferringAsset(null);
    showToast('Asset transferred! ↗');
    fetchData();
  }, [fetchData, showToast]);

  const handleCancelFromAssets = useCallback((listingId: string) => {
    setCancellingListing({ id: listingId, asset_id: '', seller_id: '', price: 0, currency: 'PI', status: 'ACTIVE', title: 'this listing', description: '', category: '', created_at: '' });
  }, []);

  useEffect(() => { fetchData(); },      [fetchData]);
  useEffect(() => { fetchListings(); },  [fetchListings]);
  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const token = typeof window !== 'undefined' ? getTokenFromCookie() : null;
  if (isLoading || (!isAuthenticated && !token)) return <Skeleton />;

  const filtered       = assetFilter === 'all' ? assets : assets.filter(a => a.asset_type === (assetFilter === 'domains' ? 'domain' : 'nft'));
  const totalValue     = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);
  const displayBalance = settings.hideBalance ? '****' : wallet ? `${Number(wallet.balance).toFixed(2)} π` : '—';
  const displayTotal   = settings.hideBalance ? '****' : `${totalValue.toFixed(2)}`;

  return (
    <div style={{ minHeight: '100vh', background: '#020205', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif', paddingBottom: 80 }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%,100%{opacity:.3}50%{opacity:.7} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:none} }
        .fade-in { animation: slideUp 0.4s ease; }
        .btn:active { transform: scale(0.97); }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 70, left: 16, right: 16, zIndex: 999, background: toast.type === 'success' ? '#051a0a' : '#1a0505', border: `1px solid ${toast.type === 'success' ? '#7ee7c040' : '#e74c3c40'}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'toastIn 0.3s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 16 }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: toast.type === 'success' ? '#7ee7c0' : '#e74c3c' }}>{toast.msg}</span>
        </div>
      )}

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

      {transferringAsset && (
        <TransferModal
          asset={transferringAsset}
          onClose={() => setTransferringAsset(null)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* ── Payment Modal (Assets Direct) ✅ ── */}
      {payStatus !== 'idle' && activeListing && (
        <div
          style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
          onClick={['success','cancelled','error'].includes(payStatus) ? closePayModal : undefined}
        >
          <div
            style={{ width:'100%', maxWidth:320, borderRadius:28, background:'#0d0d18', border:'1px solid rgba(212,175,55,0.2)', padding:'36px 28px', textAlign:'center', boxShadow:'0 40px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width:56, height:56, borderRadius:18, background:'linear-gradient(135deg,#d4af37,#8b6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 14px', color:'#07070f' }}>💎</div>
            <p style={{ fontSize:12, color:'#4a4a5a', marginBottom:6, textTransform:'uppercase', letterSpacing:2 }}>{activeListing.title}</p>
            <div style={{ fontSize:40, fontWeight:900, color:'#d4af37', marginBottom:24, fontFamily:'Georgia,serif' }}>{activeListing.price}π</div>

            {(payStatus === 'creating' || payStatus === 'paying') && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(212,175,55,0.15)', borderTopColor:'#d4af37', animation:'spin 0.8s linear infinite' }} />
                <p style={{ fontSize:13, color:'#4a4a5a' }}>
                  {payStatus === 'creating' ? 'Preparing payment...' : 'Confirm in Pi Wallet...'}
                </p>
              </div>
            )}

            {payStatus === 'success' && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{ fontSize:44 }}>✅</div>
                <p style={{ fontSize:16, fontWeight:700, color:'#7ee7c0' }}>Purchase Successful!</p>
                <button onClick={closePayModal}
                  style={{ padding:'12px 28px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#d4af37,#b8882a)', color:'#07070f', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                  Done
                </button>
              </div>
            )}

            {(payStatus === 'cancelled' || payStatus === 'error') && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{ fontSize:44 }}>{payStatus === 'cancelled' ? '⚠️' : '❌'}</div>
                <p style={{ fontSize:14, fontWeight:700, color: payStatus === 'cancelled' ? '#f0c040' : '#e74c3c' }}>
                  {payStatus === 'cancelled' ? 'Cancelled' : 'Failed'}
                </p>
                {payMessage && <p style={{ fontSize:11, color:'#4a4a5a', maxWidth:220 }}>{payMessage}</p>}
                <div style={{ display:'flex', gap:8, marginTop:6 }}>
                  <button
                    onClick={() => { closePayModal(); setTimeout(() => activeListing && handleBuy(activeListing), 100); }}
                    style={{ padding:'10px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#d4af37,#b8882a)', color:'#07070f', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                    Try Again
                  </button>
                  <button onClick={closePayModal}
                    style={{ padding:'10px 16px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#888', fontSize:12, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <header style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'rgba(2,2,5,0.92)', backdropFilter:'blur(20px)', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="btn" onClick={() => goToTEC('HUB')} style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'6px 10px', color:'#d4af37', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <span style={{ fontSize:16 }}>🔷</span>
            <span style={{ fontSize:8, color:'#4a4a5a', letterSpacing:1 }}>HUB</span>
          </button>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#d4af37', lineHeight:1 }}>Assets</div>
            <div style={{ fontSize:9, color:'#3a3a4a', letterSpacing:2 }}>TEC ECOSYSTEM</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!piReady && <span style={{ fontSize:9, color:'#4a4a5a' }}>Pi connecting...</span>}
          <div style={{ fontSize:12, color:'#d4af37' }}>{user?.piUsername ? `@${user.piUsername}` : ''}</div>
          <button className="btn" onClick={() => router.push('/app/settings')} style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'8px 12px', color:'#6b6b7a', fontSize:14, cursor:'pointer' }}>⚙️</button>
        </div>
      </header>

      {activeTab !== 'portfolio' && (
        <div style={{ padding:'16px 16px 0' }} className="fade-in">
          <div style={{ borderRadius:24, padding:'22px 24px', background:'linear-gradient(135deg,rgba(26,18,8,0.9) 0%,rgba(15,15,26,0.9) 60%,rgba(10,15,31,0.9) 100%)', backdropFilter:'blur(20px)', border:'1px solid rgba(212,175,55,0.15)' }}>
            <div style={{ fontSize:10, color:'#4a4a5a', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>PORTFOLIO VALUE</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:36, fontWeight:900, color:'#d4af37', letterSpacing:-1 }}>{dataLoading ? '—' : displayTotal}</span>
              <span style={{ fontSize:20, color:'rgba(212,175,55,0.5)' }}>{settings.hideBalance ? '' : 'π'}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { label:'Balance',   value:displayBalance },
                { label:'Assets',    value:assets.length.toString() },
                { label:'Purchases', value:purchases.length.toString() },
              ].map(s => (
                <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(10px)', borderRadius:12, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#4a4a5a', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:'14px 16px 0', display:'flex', gap:8, overflowX:'auto' }}>
        {([
          { key:'assets',      label:'💎 My Assets'  },
          { key:'marketplace', label:'🛒 Marketplace' },
          { key:'purchases',   label:'🧾 History'     },
          { key:'portfolio',   label:'📊 Portfolio'   },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding:'8px 16px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:activeTab===tab.key?'rgba(212,175,55,0.12)':'rgba(255,255,255,0.04)', backdropFilter:'blur(10px)', color:activeTab===tab.key?'#d4af37':'#4a4a5a', border:activeTab===tab.key?'1px solid rgba(212,175,55,0.3)':'1px solid transparent', transition:'all 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'assets' && (
        <div style={{ padding:'10px 16px 0', display:'flex', gap:8, alignItems:'center' }}>
          {(['all','domains','nfts'] as const).map(tab => (
            <button key={tab} onClick={() => setAssetFilter(tab)} style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', background:assetFilter===tab?'rgba(255,255,255,0.08)':'none', color:assetFilter===tab?'#fff':'#3a3a4a', border:assetFilter===tab?'1px solid rgba(255,255,255,0.12)':'1px solid transparent', transition:'all 0.2s' }}>
              {tab==='all'?'All':tab==='domains'?'🌐 Domains':'🎨 NFTs'}
            </button>
          ))}
          <button onClick={() => setMintingNFT(true)} style={{ marginLeft:'auto', padding:'6px 14px', borderRadius:20, background:'rgba(123,107,200,0.08)', border:'1px solid rgba(123,107,200,0.25)', color:'#b39ddb', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            + NFT
          </button>
        </div>
      )}

      <div style={{ padding:'12px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {activeTab === 'assets' && (
          <AssetsTab
            assets={assets} filtered={filtered} dataLoading={dataLoading}
            showValues={settings.showValues} onListForSale={setListingAsset}
            onCancelListing={handleCancelFromAssets} onMintNFT={() => setMintingNFT(true)}
            onGoMarketplace={() => setActiveTab('marketplace')} onTransfer={handleTransfer} onRefresh={fetchData}
          />
        )}
        {activeTab === 'marketplace' && (
          <MarketplaceTab
            listings={listings} currentUserId={user?.id ?? ''}
            onBuy={handleBuy} onEditPrice={setEditingListing}
            onCancel={setCancellingListing} onGoAssets={() => setActiveTab('assets')}
          />
        )}
        {activeTab === 'purchases' && (
          <PurchasesTab purchases={purchases} onGoMarketplace={() => setActiveTab('marketplace')} />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioTab assets={assets} wallet={wallet} showValues={settings.showValues} hideBalance={settings.hideBalance} />
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} setAssetFilter={setAssetFilter} />
    </div>
  );
}

export default function AssetsPage() {
  return <ErrorBoundary><AssetsPageInner /></ErrorBoundary>;
}
