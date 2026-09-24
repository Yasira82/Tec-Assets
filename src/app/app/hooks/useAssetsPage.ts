'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }                        from 'next/navigation';
import { usePiAuth }                        from '@/lib-client/hooks/usePiAuth';
import { useSettings }                      from '@/lib/hooks/useSettings';
import { readFollowUp, PENDING_MESSAGE }    from '@/lib/purchase-followup';
import { Asset, Listing, WalletData, MainTab, Purchase } from '../types';
import {
  createPaymentRecord,
  createU2APayment,
  handleBuy as hubHandleBuy,
} from '@yasser172/tec-ui/payment';

const HUB_URL    = process.env.NEXT_PUBLIC_HUB_URL    ?? 'https://hub.tecosystem.app';
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? 'https://assets.tecosystem.app';
// The SSO return address must be the host the visitor is ACTUALLY on, read at
// CLICK time. As a module constant it was frozen to the Mainnet host, so a
// visitor on the paired Testnet host was handed to the Hub with the wrong
// return address: the Hub logged them in correctly and returned them to the
// OTHER origin, where the session then lived. The Testnet host stayed
// "Unauthorized" with nothing in any log, because nothing failed.
//
// Nothing is weakened: this is the origin the page was SERVED from, which a
// visitor cannot forge, and the Hub validates every target against its own
// ALLOWED_TARGETS regardless.
const ssoUrl = (): string => {
  const back = typeof window === 'undefined' ? ASSETS_URL : window.location.origin;
  return `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(back)}`;
};

export const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ')
    .find(r => r.startsWith('tec_csrf='))?.split('=')?.[1] ?? '';
};

export const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(r => r.startsWith('tec_access_token='));
  return match ? match.split('=')[1] : null;
};

export function useAssetsPage() {
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
  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [piReady, setPiReady] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Pi SDK ready ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__TEC_PI_READY) { setPiReady(true); return; }
    const h = () => setPiReady(true);
    window.addEventListener('tec-pi-ready', h, { once: true });
    return () => window.removeEventListener('tec-pi-ready', h);
  }, []);

  // ── Default tab from settings ─────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (settings.defaultTab === 'domains') { setActiveTab('assets'); setAssetFilter('domains'); }
    else if (settings.defaultTab === 'nfts') { setActiveTab('assets'); setAssetFilter('nfts'); }
  }, [loaded, settings.defaultTab]);

  // ── Data fetching ─────────────────────────────────────────
  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch('/api/bff/marketplace', { credentials: 'include', cache: 'no-store' });
      if (res.ok) { const d = await res.json(); setListings(d?.listings ?? []); }
    } catch { /* silent */ }
  }, []);

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/bff/marketplace/purchases', { credentials: 'include', cache: 'no-store' });
      if (res.ok) { const d = await res.json(); setPurchases(d?.purchases ?? []); }
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    if (!getTokenFromCookie()) return;
    setDataLoading(true);
    try {
      const [walletRes, assetsRes] = await Promise.all([
        fetch('/api/bff/wallet/balance', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/bff/assets/list',    { credentials: 'include', cache: 'no-store' }),
      ]);
      if (walletRes.ok) setWallet(await walletRes.json());
      if (assetsRes.ok) { const d = await assetsRes.json(); setAssets(d?.data ?? []); }
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, []);

  // ── Payment success handler ───────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    const token = getTokenFromCookie();
    if (!token && !isAuthenticated) { window.location.href = ssoUrl(); return; }

    const params        = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    if (paymentStatus !== 'success') return;

    const txid      = params.get('txid')       ?? '';
    const paymentId = params.get('payment_id') ?? '';
    const productId = params.get('product_id') ?? '';

    // Each follow-up is answered from the payment's own event (lib/purchase-followup):
    // delivered, pending — the asset-service delivers it from payment.completed.v1
    // shortly, whether or not this call succeeds — or refused, which is a refund.
    const post = (url: string, body: unknown) => fetch(url, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body:        JSON.stringify(body),
    });
    const settle = async (res: Response, doneMessage: string, refresh: () => void) => {
      const f = await readFollowUp(res);
      if (f.state === 'done') { showToast(doneMessage); refresh(); return; }
      if (f.state === 'rejected') { showToast(f.message, 'error'); refresh(); return; }
      showToast(PENDING_MESSAGE);
      setTimeout(refresh, 4000);
    };
    const lost = (refresh: () => void) => () => { showToast(PENDING_MESSAGE); setTimeout(refresh, 4000); };

    if (productId.startsWith('domain-nft:')) {
      const assetId = productId.split(':')[1] ?? '';
      setActiveTab('assets');
      post('/api/bff/assets/mint-as-nft', { asset_id: assetId, transactionId: paymentId })
        .then((res) => settle(res, 'Domain minted as NFT! 🎨', fetchData))
        .catch(lost(fetchData));
    } else if (productId.startsWith('nft:')) {
      setActiveTab('assets');
      // The NFT's name and image travel inside the payment's own product id; the
      // asset-service reads them from there. What is sent here only files the upload in storage.
      let meta: { n?: string; k?: string; m?: string } = {};
      try { meta = JSON.parse(atob(productId.slice(4))); } catch { /* the payment still carries it */ }
      post('/api/bff/nft/register', { paymentId, name: meta.n, key: meta.k, mimeType: meta.m })
        .then((res) => settle(res, 'NFT Minted! 🎨', fetchData))
        .catch(lost(fetchData));
    } else if (productId && paymentId) {
      setActiveTab('purchases');
      const refresh = () => { fetchPurchases(); fetchData(); };
      post('/api/bff/marketplace/buy', { listing_id: productId, payment_id: paymentId, txid })
        .then((res) => settle(res, 'Purchase successful! 🎉', refresh))
        .catch(lost(refresh));
    }
    window.history.replaceState({}, '', '/app');
  }, [isLoading, isAuthenticated, showToast, fetchPurchases, fetchData]);

  // ── Handlers ──────────────────────────────────────────────
  const handleBuy = useCallback(async (listing: Listing) => {
  if ((window as any).__TEC_PI_FOREIGN_SESSION || !(window as any).__TEC_PI_READY) {
    hubHandleBuy({
      amount:    listing.price,
      memo:      `Buy ${listing.title} — TEC Assets`,
      productId: listing.id,
      returnUrl: `${ASSETS_URL}/app`,
      source:    'assets',
    });
    return;
  }

  try {
    const internalId = await createPaymentRecord(
      listing.price,
      listing.id,
      `Buy ${listing.title} — TEC Assets`,
      'assets',
    );
    if (!internalId) { showToast('Payment init failed — try again', 'error'); return; }

    const result = await createU2APayment(
      listing.price,
      `Buy ${listing.title} — TEC Assets`,
      { source: 'assets', listing_id: listing.id },
      internalId,
    );

    if (result.success) {
      setActiveTab('purchases');
      const refresh = () => { fetchData(); fetchListings(); fetchPurchases(); };
      try {
        const res = await fetch('/api/bff/marketplace/buy', {
          method:      'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken(),
          },
          body: JSON.stringify({
            listing_id: listing.id,
            payment_id: result.paymentId,
            txid:       result.txid,
          }),
        });
        const f = await readFollowUp(res);
        if (f.state === 'done')          showToast('Purchase successful! 🎉');
        else if (f.state === 'rejected') showToast(f.message, 'error');
        else { showToast(PENDING_MESSAGE); setTimeout(refresh, 4000); }
      } catch {
        // Not lost: the asset-service delivers the purchase from the payment's own
        // payment.completed.v1 event, whether or not this call ever arrives.
        showToast(PENDING_MESSAGE);
        setTimeout(refresh, 4000);
      }
      refresh();

    } else if (result.status === 'cancelled') {
      showToast('Purchase cancelled', 'error');
    } else {
      showToast(`Purchase failed: ${result.message ?? 'unknown'}`, 'error');
    }
  } catch {
    showToast('Payment error — try again', 'error');
  }
}, [showToast, fetchData, fetchListings, fetchPurchases, setActiveTab]);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancellingListing) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/bff/marketplace/cancel', {
        method:  'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body:    JSON.stringify({ listingId: cancellingListing.id }),
      });
      if (res.ok) { fetchListings(); fetchData(); }
    } catch { /* silent */ }
    finally { setCancelLoading(false); setCancellingListing(null); }
  }, [cancellingListing, fetchListings, fetchData]);

  const handleTransfer = useCallback((asset: Asset) => {
    setTransferringAsset(asset);
  }, []);

  const handleTransferSuccess = useCallback(() => {
    setTransferringAsset(null);
    showToast('Asset transferred! ↗');
    fetchData();
  }, [fetchData, showToast]);

  const handleCancelFromAssets = useCallback((listingId: string) => {
    setCancellingListing({
      id: listingId, asset_id: '', seller_id: '', price: 0,
      currency: 'PI', status: 'ACTIVE', title: 'this listing',
      description: '', category: '', created_at: '',
    });
  }, []);

  // ── Init fetches ──────────────────────────────────────────
  useEffect(() => { fetchData(); },      [fetchData]);
  useEffect(() => { fetchListings(); },  [fetchListings]);
  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  return {
    // auth
    user, isAuthenticated, isLoading, router,
    // data
    wallet, assets, listings, purchases,
    // ui state
    activeTab, setActiveTab,
    assetFilter, setAssetFilter,
    dataLoading,
    listingAsset, setListingAsset,
    editingListing, setEditingListing,
    cancellingListing, setCancellingListing,
    cancelLoading,
    mintingNFT, setMintingNFT,
    transferringAsset, setTransferringAsset,
    toast, piReady,
    settings,
    // handlers
    showToast,
    fetchData, fetchListings, fetchPurchases,
    handleBuy,
    handleCancelConfirm,
    handleTransfer,
    handleTransferSuccess,
    handleCancelFromAssets,
  };
            }
