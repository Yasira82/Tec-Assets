'use client';

import { Listing } from '../types';

export function CancelConfirmModal({
  listing,
  onClose,
  onConfirm,
  loading,
}: {
  listing:   Listing;
  onClose:   () => void;
  onConfirm: () => void;
  loading:   boolean;
}) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)', zIndex: 300,
        backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: '#0B1020', borderTop: '1px solid #e74c3c30',
        borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 8 }}>
          Cancel Listing?
        </div>
        <div style={{ fontSize: 13, color: '#4a4a5a', textAlign: 'center', marginBottom: 24 }}>
          {listing.title} {listing.price ? `· ${listing.price}π` : ''}
        </div>
        <button onClick={onConfirm} disabled={loading} style={{
          width: '100%', padding: '16px',
          background: 'linear-gradient(135deg,#7f1d1d,#991b1b)',
          border: 'none', borderRadius: 16,
          color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
        }}>
          {loading ? 'Cancelling...' : 'Yes, Cancel Listing'}
        </button>
        <button onClick={onClose} style={{
          width: '100%', padding: '14px', marginTop: 10,
          background: 'none', border: '1px solid #ffffff10',
          borderRadius: 16, color: '#4a4a5a', fontSize: 14, cursor: 'pointer',
        }}>
          Keep Listing
        </button>
      </div>
    </>
  );
}
