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
        domain:          window.location.hostname,
        path:            window.location.pathname,
        referrer:        document.referrer?.split('/')[2] ?? 'none',
      });
    };

    check();
    const timer = setInterval(check, 500);

    const run = async () => {
      addLog('── START FULL DIAGNOSTIC ──');

      // 1. Check Pi SDK loaded
      addLog(`window.Pi = ${typeof w.Pi}`);
      if (!w.Pi) { addLog('❌ Pi SDK not loaded — STOP'); return; }

      // 2. Check Pi.init state
      addLog(`__TEC_PI_READY = ${w.__TEC_PI_READY}`);
      addLog(`__TEC_PI_FOREIGN_SESSION = ${w.__TEC_PI_FOREIGN_SESSION}`);

      // 3. Wait for ready
      if (!w.__TEC_PI_READY) {
        addLog('Waiting for tec-pi-ready...');
        await new Promise<void>(r => {
          w.addEventListener('tec-pi-ready', () => r(), { once: true });
          setTimeout(r, 8000);
        });
        addLog(`After wait: READY=${w.__TEC_PI_READY} FOREIGN=${w.__TEC_PI_FOREIGN_SESSION}`);
      }

      // 4. Try Pi.init() again
      addLog('── TEST: Pi.init() again ──');
      try {
        w.Pi.init({ version: '2.0', sandbox: false });
        addLog('✅ Pi.init() succeeded (no error)');
      } catch (e: any) {
        addLog(`⚠️ Pi.init() threw: ${e?.message ?? String(e)}`);
      }

      // 5. Try authenticate
      addLog('── TEST: Pi.authenticate ──');
      try {
        const r = await w.Pi.authenticate(['username', 'payments'], () => {});
        addLog(`✅ auth OK uid=${r?.user?.uid?.slice(0,8)} app=${r?.user?.app_id?.slice(0,8)}`);
        w.__TEC_PI_AUTHENTICATED = true;
      } catch (e: any) {
        addLog(`❌ auth FAIL: ${e?.message ?? String(e)}`);
      }

      // 6. Try createPayment
      addLog('── TEST: Pi.createPayment ──');
      try {
        w.Pi.createPayment(
          { amount: 0.001, memo: 'diag', metadata: { test: true } },
          {
            onReadyForServerApproval: (id: string) => addLog(`📞 approve id=${id.slice(0,8)}`),
            onReadyForServerCompletion: () => addLog('📞 complete'),
            onCancel: () => addLog('⚠️ cancelled'),
            onError: (e: any) => addLog(`📞 onError: ${e?.message ?? String(e)}`),
          },
        );
        addLog('✅ createPayment did not throw');
      } catch (e: any) {
        addLog(`❌ createPayment THREW: ${e?.message ?? String(e)}`);
      }

      addLog('── END DIAGNOSTIC ──');
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
      fontFamily: 'monospace', padding: 8, maxHeight: '55vh',
      overflow: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <b>Pi Debug v2</b>
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none', color: '#f00', fontSize: 14,
        }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8 }}>
        {Object.entries(state).map(([k, v]) => (
          <div key={k} style={{
            color: v === 'true' ? '#0f0' : v === 'false' ? '#f44' : '#ff0',
          }}>
            {k}: <b>{v}</b>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #333', paddingTop: 4 }}>
        {log.map((l, i) => (
          <div key={i} style={{
            color: l.includes('✅') ? '#0f0'
                 : l.includes('❌') ? '#f44'
                 : l.includes('──') ? '#ff0'
                 : '#aaa',
            marginBottom: 2,
          }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
