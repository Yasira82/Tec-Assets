'use client';

import { useRouter }     from 'next/navigation';
import { usePiAuth }     from '@/lib-client/hooks/usePiAuth';
import { useSettings }   from '@/lib/hooks/useSettings';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ── Toggle ────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 48, height: 28, borderRadius: 14,
        background:  value ? 'linear-gradient(135deg,#d4af37,#b8882a)' : '#ffffff15',
        border:      'none', cursor: 'pointer',
        position:    'relative', transition: 'all 0.25s',
        flexShrink:  0,
      }}>
      <span style={{
        position:   'absolute',
        top:        3, left: value ? 22 : 3,
        width:      22, height: 22, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s',
        boxShadow:  '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

// ── Select ────────────────────────────────────────────────
function Select<T extends string>({
  value, options, onChange,
}: {
  value:    T;
  options:  { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          style={{
            padding:    '6px 14px', borderRadius: 20,
            fontSize:   12, fontWeight: 600, cursor: 'pointer',
            background: value === opt.value ? '#d4af3720' : '#ffffff08',
            color:      value === opt.value ? '#d4af37'   : '#6b6b7a',
            border:     value === opt.value ? '1px solid #d4af3740' : '1px solid transparent',
            transition: 'all 0.2s',
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────
function Section({ title, icon, children }: {
  title:    string;
  icon:     string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background:   '#0d0d14',
      border:       '1px solid #ffffff08',
      borderRadius: 20,
      overflow:     'hidden',
      marginBottom: 12,
    }}>
      <div style={{
        padding:    '14px 20px',
        borderBottom: '1px solid #ffffff06',
        display:    'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b6b7a', letterSpacing: 2, textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────
function Row({ label, desc, children }: {
  label:    string;
  desc?:    string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      padding:     '14px 20px',
      display:     'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid #ffffff04',
      gap:         12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
function SettingsPageInner() {
  const { user, logout }          = usePiAuth();
  const { settings, update, reset } = useSettings();
  const router                    = useRouter();

  return (
    <div style={{
      minHeight:   '100vh',
      background:  '#020205',
      color:       '#fff',
      fontFamily:  '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      paddingBottom: 40,
    }}>
      <style>{`
        .btn:active { transform: scale(0.97); }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .fade-in { animation: slideUp 0.3s ease; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding:      '14px 20px',
        borderBottom: '1px solid #ffffff08',
        display:      'flex', alignItems: 'center', gap: 12,
        position:     'sticky', top: 0,
        background:   'rgba(2,2,5,0.95)',
        backdropFilter: 'blur(20px)', zIndex: 100,
      }}>
        <button className="btn" onClick={() => router.back()}
          style={{
            background: '#ffffff08', border: '1px solid #ffffff10',
            borderRadius: 10, padding: '6px 12px',
            color: '#d4af37', fontSize: 14, cursor: 'pointer',
          }}>
          ←
        </button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Settings</div>
          <div style={{ fontSize: 9, color: '#4a4a5a', letterSpacing: 2 }}>TEC ASSETS</div>
        </div>
      </header>

      <div style={{ padding: '16px 16px 0' }} className="fade-in">

        {/* ── Profile ── */}
        <Section title="Profile" icon="👤">
          <div style={{
            padding: '20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg,#d4af37,#b8882a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 900, color: '#0a0800',
              flexShrink: 0,
            }}>
              {user?.piUsername?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                @{user?.piUsername ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 3 }}>
                {user?.role ?? 'Member'} · {user?.subscriptionPlan ?? 'Free'}
              </div>
              <div style={{
                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#7ee7c010', border: '1px solid #7ee7c030',
                borderRadius: 20, padding: '3px 10px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ee7c0' }} />
                <span style={{ fontSize: 10, color: '#7ee7c0', fontWeight: 600 }}>Connected to Pi</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance" icon="🎨">
          <Row label="Theme" desc="Choose your preferred theme">
            <Select
              value={settings.theme}
              onChange={v => update('theme', v)}
              options={[
                { value: 'dark',   label: '🌙 Dark'   },
                { value: 'light',  label: '☀️ Light'  },
                { value: 'system', label: '⚙️ System' },
              ]}
            />
          </Row>
          <Row label="Language" desc="Display language">
            <Select
              value={settings.language}
              onChange={v => update('language', v)}
              options={[
                { value: 'en', label: '🇺🇸 EN' },
                { value: 'ar', label: '🇸🇦 AR' },
              ]}
            />
          </Row>
        </Section>

        {/* ── Assets Display ── */}
        <Section title="Assets Display" icon="💎">
          <Row label="Show Values" desc="Display π values on assets">
            <Toggle value={settings.showValues} onChange={v => update('showValues', v)} />
          </Row>
          <Row label="Hide Balance" desc="Blur your portfolio balance">
            <Toggle value={settings.hideBalance} onChange={v => update('hideBalance', v)} />
          </Row>
          <Row label="Currency" desc="Value display currency">
            <Select
              value={settings.currency}
              onChange={v => update('currency', v)}
              options={[
                { value: 'PI',  label: 'π PI'  },
                { value: 'USD', label: '$ USD' },
              ]}
            />
          </Row>
          <Row label="Default Tab" desc="Tab shown on open">
            <Select
              value={settings.defaultTab}
              onChange={v => update('defaultTab', v)}
              options={[
                { value: 'all',     label: 'All'     },
                { value: 'domains', label: 'Domains' },
                { value: 'nfts',    label: 'NFTs'    },
              ]}
            />
          </Row>
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications" icon="🔔">
          <Row label="Asset Updates" desc="Notify when assets change">
            <Toggle value={settings.notifyAssets} onChange={v => update('notifyAssets', v)} />
          </Row>
          <Row label="Price Alerts" desc="Pi price movement alerts">
            <Toggle value={settings.notifyPrice} onChange={v => update('notifyPrice', v)} />
          </Row>
        </Section>

        {/* ── Privacy ── */}
        <Section title="Privacy" icon="🔒">
          <Row label="Hide Balance" desc="Show **** instead of amount">
            <Toggle value={settings.hideBalance} onChange={v => update('hideBalance', v)} />
          </Row>
        </Section>

        {/* ── About ── */}
        <Section title="About" icon="ℹ️">
          <Row label="Version">
            <span style={{ fontSize: 13, color: '#6b6b7a' }}>1.0.0</span>
          </Row>
          <Row label="Domain">
            <span style={{ fontSize: 13, color: '#6b6b7a' }}>assets.pi</span>
          </Row>
          <Row label="Ecosystem">
            <span style={{ fontSize: 13, color: '#d4af37' }}>TEC · 24 Apps</span>
          </Row>
          <Row label="Built on">
            <span style={{ fontSize: 13, color: '#6b6b7a' }}>Pi Network</span>
          </Row>
        </Section>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <button className="btn" onClick={reset}
            style={{
              padding: '14px', borderRadius: 16,
              background: '#ffffff08', border: '1px solid #ffffff10',
              color: '#6b6b7a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
            Reset to Defaults
          </button>
          <button className="btn" onClick={logout}
            style={{
              padding: '14px', borderRadius: 16,
              background: '#1a0505', border: '1px solid #e74c3c30',
              color: '#e74c3c', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsPageInner />
    </ErrorBoundary>
  );
}
