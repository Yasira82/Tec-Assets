'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }       from 'next/navigation';
import { usePiAuth }       from '@/lib-client/hooks/usePiAuth';
import { ErrorBoundary }   from '@/components/ErrorBoundary';
import { goToTEC }         from '@/lib/tec-navigation';
import { useSettings }     from '@/lib/hooks/useSettings';
import { GlobalNav }       from '@yasser172/tec-ui';

const SSO_URL =
  'https://tec-app.vercel.app/api/auth/sso?target=' +
  encodeURIComponent('https://tec-assets.vercel.app');

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

interface WalletData {
  balance:  number;
  currency: string;
  walletId: string | null;
}

type MainTab = 'assets' | 'portfolio' | 'domains';

// ── Helper ────────────────────────────────────────────────
const getTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('tec_access_token='));
  return match ? match.split('=')[1] : null;
};

const maskValue = (_value: string): string => '****';

// ── Asset Card ────────────────────────────────────────────
function AssetCard({ asset, showValues }: { asset: Asset; showValues: boolean }) {
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
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#d4af37' }}>
          {showValues ? `${Number(asset.value).toFixed(2)} π` : maskValue('')}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 1,
          color: asset.status === 'active' ? '#7ee7c0' : '#6b6b7a',
        }}>
          {asset.status}
        </div>
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
            { label: 'Assets Value', value: showValues ? fmt(`${totalValue.toFixed(2)} π`) : '****'      },
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

      <button onClick={() => goToTEC('DASHBOARD')}
        style={{
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

  const [wallet,      setWallet]      = useState<WalletData | null>(null);
  const [assets,      setAssets]      = useState<Asset[]>([]);
  const [activeTab,   setActiveTab]   = useState<MainTab>('assets');
  const [assetFilter, setAssetFilter] = useState<'all' | 'domains' | 'nfts'>('all');
  const [dataLoading, setDataLoading] = useState(true);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const token = typeof window !== 'undefined' ? getTokenFromCookie() : null;
  if (isLoading || (!isAuthenticated && !token)) return <Skeleton />;

  const filtered   = assetFilter === 'all'
    ? assets
    : assets.filter(a => a.asset_type === (assetFilter === 'domains' ? 'domain' : 'nft'));

  const totalValue = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);

  const displayBalance = settings.hideBalance
    ? '****'
    : wallet ? `${Number(wallet.balance).toFixed(2)} π` : '—';

  const displayTotal = settings.hideBalance
    ? '****'
    : `${totalValue.toFixed(2)}`;

  return (
    <div style={{
      minHeight: '100vh', background: '#020205', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      paddingBottom: 90,
    }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }
        .fade-in { animation: slideUp 0.4s ease; }
        .btn:active { transform: scale(0.97); }
      `}</style>

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

      {/* ── Asset Filter Tabs ── */}
      {activeTab === 'assets' && (
        <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
          {(['all', 'domains', 'nfts'] as const).map(tab => (
            <button key={tab} onClick={() => setAssetFilter(tab)}
              style={{
                padding: '8px 18px', borderRadius: 20, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, letterSpacing: 1,
                textTransform: 'uppercase' as const,
                background: assetFilter === tab ? '#d4af3720' : '#ffffff08',
                color:      assetFilter === tab ? '#d4af37'   : '#6b6b7a',
                border:     assetFilter === tab ? '1px solid #d4af3740' : '1px solid transparent',
                transition: 'all 0.2s',
              }}>
              {tab === 'all' ? 'All' : tab === 'domains' ? '🌐 Domains' : '🎨 NFTs'}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {activeTab === 'portfolio' ? (
        <PortfolioTab
          assets={assets}
          wallet={wallet}
          showValues={settings.showValues}
          hideBalance={settings.hideBalance}
        />
      ) : (
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dataLoading ? (
            <>
              <style>{`.sk{animation:shimmer 1.4s ease infinite;background:#0d0d14;border-radius:18px}`}</style>
              {[1,2,3].map(i => <div key={i} className="sk" style={{ height: 76 }} />)}
            </>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, color: '#4a4a5a' }}>No assets yet</div>
              <div style={{ fontSize: 12, color: '#2a2a3a', marginTop: 6 }}>
                Your digital assets will appear here
              </div>
              <button onClick={() => goToTEC('HUB')}
                style={{
                  marginTop: 20, padding: '12px 24px',
                  background: 'linear-gradient(135deg,#d4af37,#b8882a)',
                  border: 'none', borderRadius: 14,
                  color: '#0a0800', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                🔷 Go to TEC Hub
              </button>
            </div>
          ) : (
            filtered.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                showValues={settings.showValues}
              />
            ))
          )}
        </div>
      )}

      {/* ── Bottom Nav — من @yasser172/tec-ui ── */}
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
            icon:   '📊',
            label:  'Portfolio',
            app:    null,
            action: () => setActiveTab('portfolio'),
          },
          {
            icon:   '🌐',
            label:  'Domains',
            app:    null,
            action: () => { setActiveTab('assets'); setAssetFilter('domains'); },
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
