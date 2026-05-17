'use client';

import { useState } from 'react';
import { Asset }    from '../types';

interface Props {
  asset:     Asset;
  onClose:   () => void;
  onSuccess: () => void;
}

const getCsrf  = () => document.cookie.split('; ').find(r => r.startsWith('tec_csrf='))?.split('=')?.[1] ?? '';

export function TransferModal({ asset, onClose, onSuccess }: Props) {
  const [recipient,   setRecipient]   = useState('');
  const [confirming,  setConfirming]  = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleConfirm = () => {
    if (!recipient.trim()) { setError('Enter recipient Pi username'); return; }
    setError(null);
    setConfirming(true);
  };

  const handleTransfer = async () => {
    setTransferring(true); setError(null);
    try {
      const res = await fetch('/api/bff/assets/transfer', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body:        JSON.stringify({ asset_id: asset.id, recipient_username: recipient.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Transfer failed');
      onSuccess();
      onClose();
    } catch (e: unknown) { setError((e as Error).message); setConfirming(false); }
    finally { setTransferring(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#ffffff08', border: '1px solid #ffffff12',
    borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(2,2,5,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0d0d14', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '20px 20px 16px 16px', padding: 24, width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>↗ Transfer Asset</div>
            <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 2 }}>{asset.name}</div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#ffffff08', border: 'none', color: '#6b6b7a', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        {/* Warning */}
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>⚠️ Irreversible Action</div>
          <div style={{ fontSize: 10, color: '#6b6b7a', marginTop: 3 }}>
            Transferring this asset is permanent. You will lose ownership.
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {!confirming ? (
          <>
            <div style={{ fontSize: 10, color: '#6b6b7a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Recipient Pi Username
            </div>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#4a4a5a', fontSize: 14 }}>@</span>
              <input
                value={recipient}
                onChange={e => setRecipient(e.target.value.replace('@', ''))}
                placeholder="piusername"
                style={{ ...inputStyle, paddingLeft: 28 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: '13px', borderRadius: 14, background: 'transparent', border: '1px solid #ffffff15', color: '#6b6b7a', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConfirm}
                style={{ flex: 2, padding: '13px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Continue →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation */}
            <div style={{ background: '#ffffff05', border: '1px solid #ffffff0a', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#6b6b7a', marginBottom: 12 }}>Transfer summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#6b6b7a' }}>Asset</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{asset.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#6b6b7a' }}>Type</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{asset.asset_type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#6b6b7a' }}>To</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#d4af37' }}>@{recipient}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirming(false)} disabled={transferring}
                style={{ flex: 1, padding: '13px', borderRadius: 14, background: 'transparent', border: '1px solid #ffffff15', color: '#6b6b7a', fontSize: 14, cursor: 'pointer' }}>
                Back
              </button>
              <button onClick={handleTransfer} disabled={transferring}
                style={{ flex: 2, padding: '13px', borderRadius: 14, background: transferring ? '#ffffff08' : 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: transferring ? '#4a4a5a' : '#ef4444', fontSize: 14, fontWeight: 800, cursor: transferring ? 'not-allowed' : 'pointer' }}>
                {transferring ? '⏳ Transferring...' : '↗ Confirm Transfer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
