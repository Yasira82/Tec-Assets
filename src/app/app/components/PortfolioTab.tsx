'use client';

import { Asset, WalletData } from '../types';
import { goToTEC }           from '@/lib/tec-navigation';

export function PortfolioTab({
  assets, wallet, showValues, hideBalance,
}: {
  assets:      Asset[];
  wallet:      WalletData | null;
  showValues:  boolean;
  hideBalance: boolean;
}) {
  const totalValue  = assets.reduce((sum, a) => sum + Number(a.value ?? 0), 0);
  const fmt = (v: string) => hideBalance ? '****' : v;

  const breakdown = [
    { label: '🌐 Domains',       type: 'domain'        },
    { label: '🎨 NFTs',          type: 'nft'           },
    { label: '🪙 Tokens',        type: 'token'         },
    { label: '🏆 Badges',        type: 'badge'         },
    { label: '💎 Digital Assets', type: 'digital_asset' },
  ].map(item => ({
    ...item,
    count: assets.filter(a => a.asset_type === item.type).length,
  })).filter(item => item.count > 0);

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

      {breakdown.length > 0 && (
        <div style={{ borderRadius: 20, padding: '20px', background: '#0d0d14', border: '1px solid #ffffff08' }}>
          <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 12 }}>
            ASSET BREAKDOWN
          </div>
          {breakdown.map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #ffffff05',
            }}>
              <span style={{ fontSize: 13, color: '#fff' }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d4af37' }}>{item.count}</span>
            </div>
          ))}
        </div>
      )}

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
