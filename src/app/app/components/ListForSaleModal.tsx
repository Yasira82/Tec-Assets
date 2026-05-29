'use client';

import { useState }        from 'react';
import { Asset, Listing }  from '../types';

const getCsrf = (): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)tec_csrf=([^;]*)/);
  return match ? match[1] : '';
};

export function ListForSaleModal({
  asset, listing, onClose, onSuccess,
}: {
  asset?:    Asset;
  listing?:  Listing;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const isUpdate = !!listing;
  const [price,   setPrice]   = useState(isUpdate ? listing.price.toString() : '');
  const [desc,    setDesc]    = useState(isUpdate ? listing.description : '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { setError('Enter a valid price'); return; }
    setLoading(true);
    setError('');
    try {
      if (isUpdate) {
        const res = await fetch('/api/bff/marketplace/update-price', {
          method:      'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type':  'application/json',
            'x-csrf-token':  getCsrf(), // ✅
          },
          body: JSON.stringify({ listingId: listing.id, price: p }),
        });
        if (!res.ok) { setError('Failed to update price'); return; }
      } else {
        const res = await fetch('/api/bff/marketplace/list', {
          method:      'POST',
          credentials: 'include',
          headers: {
            'Content-Type':  'application/json',
            'x-csrf-token':  getCsrf(), // ✅
          },
          body: JSON.stringify({
            assetId:     asset!.id,
            price:       p,
            title:       asset!.name,
            description: desc,
          }),
        });
        if (!res.ok) { setError('Failed to list asset'); return; }
      }
      onSuccess();
      onClose();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)', zIndex: 300,
        backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: '#0d0d14', borderTop: '1px solid #d4af3720',
        borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {isUpdate ? 'Update Price' : 'List for Sale'}
        </div>
        <div style={{ fontSize: 12, color: '#4a4a5a', marginBottom: 20 }}>
          {isUpdate ? listing.title : `${asset?.name} · ${asset?.asset_type}`}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>
            {isUpdate ? 'NEW PRICE (π)' : 'PRICE (π)'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#0a0a12', border: '1px solid #d4af3740',
            borderRadius: 14, padding: '12px 16px',
          }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: '#d4af37' }}>π</span>
            <input
              type="number" min="0.01" step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 18, fontWeight: 700,
              }}
            />
          </div>
        </div>

        {!isUpdate && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>
              DESCRIPTION (optional)
            </div>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe your asset..."
              rows={2}
              style={{
                width: '100%', background: '#0a0a12',
                border: '1px solid #ffffff10', borderRadius: 14,
                padding: '12px 16px', color: '#fff', fontSize: 13,
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !price} style={{
          width: '100%', padding: '16px',
          background: price ? 'linear-gradient(135deg,#d4af37,#b8882a)' : '#ffffff10',
          border: 'none', borderRadius: 16,
          color: price ? '#0a0800' : '#4a4a5a',
          fontSize: 15, fontWeight: 800,
          cursor: price ? 'pointer' : 'default',
        }}>
          {loading
            ? (isUpdate ? 'Updating...' : 'Listing...')
            : isUpdate ? `Update to ${price || '0'}π` : `List for ${price || '0'}π`}
        </button>

        <button onClick={onClose} style={{
          width: '100%', padding: '14px', marginTop: 10,
          background: 'none', border: '1px solid #ffffff10',
          borderRadius: 16, color: '#4a4a5a', fontSize: 14, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </>
  );
}
