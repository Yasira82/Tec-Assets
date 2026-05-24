'use client';

import { MainTab } from '../types';

export function BottomNav({
  activeTab, setActiveTab, setAssetFilter,
}: {
  activeTab:      MainTab;
  setActiveTab:   (tab: MainTab) => void;
  setAssetFilter: (f: 'all' | 'domains' | 'nfts') => void;
}) {
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
          <button key={item.key} onClick={() => {
            navigator.vibrate?.(8);
            if (item.key === 'assets') setAssetFilter('all');
            setActiveTab(item.key);
          }} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 0 12px',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <div style={{
              fontSize: 20,
              filter: isActive ? 'none' : 'grayscale(1) opacity(0.4)',
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              transition: 'filter 0.2s, transform 0.2s',
            }}>{item.icon}</div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              color: isActive ? '#d4af37' : '#3a3a4a',
              transition: 'color 0.2s',
            }}>{item.label}</div>
            {isActive && (
              <div style={{
                position: 'absolute', bottom: 0,
                width: 20, height: 2, borderRadius: 1, background: '#d4af37',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
