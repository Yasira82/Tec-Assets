'use client';

import { useState, useEffect } from 'react';

export function PiDebugPanel() {
  const [state, setState] = useState<Record<string, string>>({});
  const [log, setLog]     = useState<string[]>([]);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    const w = window as any;
    const check = () => {
      setState({
        PI_READY:         String(!!w.__TEC_PI_READY),
        FOREIGN_SESSION:  String(!!w.__TEC_PI_FOREIGN_SESSION),
        AUTHENTICATED:    String(!!w.__TEC_PI_AUTHENTICATED),
        'window.Pi':      String(typeof w.Pi !== 'undefined'),
        'Pi.authenticate': String(typeof w.Pi?.authenticate === 'function'),
        'Pi.createPayment': String(typeof w.Pi?.createPayment === 'function'),
        'Pi.init':         String(typeof w.Pi?.init === 'function'),
      });
    };

    check();
    const timer = setInterval(check, 500);

    // ── Test authenticate ──
    addLog('Debug panel mounted');

    const testAuth = async () => {
      addLog('Waiting for tec-pi-ready...');

      const waitReady = (): Promise<void> => {
        if (w.__TEC_PI_READY) return Promise.resolve();
        return new Promise(r => {
          window.addEventListener('tec-pi-ready', () => r(), { once: true });
          setTimeout(r, 10000);
        });
      };

      await waitReady();
      addLog(`PI_READY=${w.__TEC_PI_READY} FOREIGN=${w.__TEC_PI_FOREIGN_SESSION}`);

      if (!w.Pi) { addLog('❌ window.Pi undefined'); return; }

      addLog('Trying Pi.authenticate...');
      try {
        const result = await w.Pi.authenticate(['username', 'payments'], () => {});
        addLog(`✅ authenticate OK: ${JSON.stringify(result).slice(0, 80)}`);
        w.__TEC_PI_AUTHENTICATED = true;
      } catch (e: any) {
        addLog(`❌ authenticate FAIL: ${e?.message ?? String(e)}`);
      }

      addLog('Trying Pi.createPayment (dry run)...');
      try {
        // dry run — onError يرجع فوراً
        w.Pi.createPayment(
          { amount: 0.001, memo: 'debug-test', metadata: {} },
          {
            onReadyForServerApproval: () => addLog('📞 onReadyForServerApproval called'),
            onReadyForServerCompletion: () => addLog('📞 onReadyForServerCompletion called'),
            onCancel: () => addLog('⚠️ onCancel'),
            onError: (err: any) => addLog(`📞 onError: ${err?.message ?? String(err)}`),
          },
        );
        addLog('✅ createPayment call did not throw');
      } catch (e: any) {
        addLog(`❌ createPayment THREW: ${e?.message ?? String(e)}`);
      }
    };

    testAuth();
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
      fontFamily: 'monospace', padding: 8, maxHeight: '50vh',
      overflow: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <b>Pi Debug Panel</b>
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none', color: '#f00', fontSize: 12,
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
            color: l.includes('✅') ? '#0f0' : l.includes('❌') ? '#f44' : '#aaa',
            marginBottom: 2,
          }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
