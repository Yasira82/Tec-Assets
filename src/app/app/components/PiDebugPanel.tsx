'use client';

import { useState, useEffect } from 'react';

export function PiDebugPanel() {
  const [state, setState] = useState<Record<string, string>>({});
  const [log, setLog]     = useState<string[]>([]);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 30));
  };

  useEffect(() => {
    const w = window as any;

    const check = () => {
      setState({
        PI_READY:        String(!!w.__TEC_PI_READY),
        FOREIGN_SESSION: String(!!w.__TEC_PI_FOREIGN_SESSION),
        AUTHENTICATED:   String(!!w.__TEC_PI_AUTHENTICATED),
        'window.Pi':     String(typeof w.Pi !== 'undefined'),
        domain:          location.hostname,
        referrer:        document.referrer?.split('/')[2] ?? 'direct',
        appId:           process.env.NEXT_PUBLIC_PI_APP_ID ?? '?',
      });
    };

    check();
    const timer = setInterval(check, 500);

    const run = async () => {
      addLog('── DIAGNOSTIC (safe) ──');
      if (!w.Pi) { addLog('❌ No Pi SDK'); return; }

      if (!w.__TEC_PI_READY) {
        addLog('Waiting tec-pi-ready...');
        await new Promise<void>(r => {
          w.addEventListener('tec-pi-ready', () => r(), { once: true });
          setTimeout(r, 8000);
        });
      }
      addLog(`READY=${w.__TEC_PI_READY} FOREIGN=${w.__TEC_PI_FOREIGN_SESSION}`);

      // ✅ Test authenticate ONLY — NO createPayment
      addLog('── TEST: authenticate ──');
      try {
        const r = await w.Pi.authenticate(['username', 'payments'], () => {});
        addLog(`✅ auth OK uid=${r?.user?.uid?.slice(0,8)} app=${r?.user?.app_id?.slice(0,8)}`);
      } catch (e: any) {
        addLog(`❌ auth FAIL: ${e?.message ?? e}`);
      }

      addLog('── END ──');
    };

    run();
    return () => clearInterval(timer);
  }, []);

  const [show, setShow] = useState(true);
  if (!show) return (
    <button onClick={() => setShow(true)} style={{
      position: 'fixed', top: 8, right: 8, zIndex: 9999,
      background: '#e74c3c', color: '#fff', border: 'none',
      borderRadius: 8, padding: '4px 8px', fontSize: 10,
    }}>🔧</button>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#000000ee', color: '#0f0', fontSize: 10,
      fontFamily: 'monospace', padding: 8, maxHeight: '40vh',
      overflow: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <b>Pi Debug (safe)</b>
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none', color: '#f00', fontSize: 14,
        }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8 }}>
        {Object.entries(state).map(([k, v]) => (
          <div key={k} style={{ color: v === 'true' ? '#0f0' : v === 'false' ? '#f44' : '#ff0' }}>
            {k}: <b>{v}</b>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #333', paddingTop: 4 }}>
        {log.map((l, i) => (
          <div key={i} style={{
            color: l.includes('✅') ? '#0f0' : l.includes('❌') ? '#f44' : l.includes('──') ? '#ff0' : '#aaa',
            marginBottom: 2,
          }}>{l}</div>
        ))}
      </div>
    </div>
  );
}
