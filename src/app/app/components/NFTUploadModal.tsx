'use client';

import { useState }         from 'react';
import { createPaymentRecord, createU2APayment } from '@/lib/pi-payment';

const HUB_URL    = process.env.NEXT_PUBLIC_HUB_URL    ?? 'https://hub.tecosystem.app';
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? 'https://assets.tecosystem.app';
const MINT_FEE   = 2;

const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)tec_csrf=([^;]*)/);
  return match ? match[1] : '';
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** Hub → Assets = Pi ownership drift → force Mode 1 */
const isHubNavigation = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.referrer.toLowerCase().includes('hub.tecosystem.app');
};

/** Mode 1: redirect to Hub PaymentModal (original — same as Commerce) */
const redirectToHubPayment = (name: string, nftMeta: string) => {
  const params = new URLSearchParams({
    pay:        '1',
    amount:     MINT_FEE.toString(),
    memo:       `Mint NFT: ${name}`,
    product_id: `nft:${nftMeta}`,
    return_url: `${ASSETS_URL}/app`,
    source:     'assets',
  });
  window.location.href = `${HUB_URL}/hub?${params.toString()}`;
};

export function NFTUploadModal({
  onClose,
  onSuccess,
}: {
  onClose:    () => void;
  onSuccess?: () => void;
}) {
  const [step,        setStep]        = useState<'upload' | 'details'>('upload');
  const [file,        setFile]        = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { setError('File too large (max 4MB)'); return; }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)) {
      setError('Only JPEG, PNG, GIF, WEBP allowed'); return;
    }
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const base64 = await toBase64(file);
      const res = await fetch('/api/bff/nft/upload', {
        method:      'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          size:     file.size,
          data:     base64,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? 'Upload failed');
        return;
      }
      const data = await res.json();
      if (!data.publicUrl) { setError('No URL returned'); return; }
      setUploadedUrl(data.publicUrl);
      setUploadedKey(data.key ?? null);
      setStep('details');
    } catch (e) {
      console.error('[NFT] upload error:', e);
      setError('Upload failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!name || !uploadedUrl) return;

    const nftMeta = btoa(JSON.stringify({
      n: name, d: description,
      u: uploadedUrl, k: uploadedKey ?? '',
      m: file?.type ?? 'image/jpeg',
    }));

    // ✅ Hub → Assets = FORCE Mode 1 (Pi ownership drift)
    if (isHubNavigation()) {
      redirectToHubPayment(name, nftMeta);
      return;
    }

    // ✅ Direct Assets: authenticate at mint-time
    if (!(window as any).__TEC_PI_AUTHENTICATED) {
      try {
        await window.Pi.authenticate(['username', 'payments'], () => {});
        (window as any).__TEC_PI_AUTHENTICATED = true;
      } catch {
        // Auth failed → Mode 1 fallback
        redirectToHubPayment(name, nftMeta);
        return;
      }
    }

    // ── Mode 2: Direct payment (only for direct Assets entry) ──
    setLoading(true);
    setError('');

    try {
      // ✅ canonical flow: pre-create the backend record with the REAL fee,
      //    then drive Pi against that internalId (ADR-009 unified contract).
      const internalId = await createPaymentRecord(
        MINT_FEE,
        `nft:${nftMeta}`,
        `Mint NFT: ${name}`,
      );
      if (!internalId) {
        setError('Payment init failed — try again');
        setLoading(false);
        return;
      }

      const result = await createU2APayment(
        MINT_FEE,
        `Mint NFT: ${name}`,
        { source: 'assets', type: 'nft_mint', product_id: `nft:${nftMeta}` },
        internalId,
      );

      if (result.success) {
        const res = await fetch('/api/bff/nft/register', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
          body: JSON.stringify({
            name, description,
            imageUrl:  uploadedUrl,
            key:       uploadedKey ?? '',
            mimeType:  file?.type ?? 'image/jpeg',
            paymentId: result.paymentId ?? '',
            txid:      result.txid     ?? '',
          }),
        });
        if (res.ok || res.status === 409) {
          onSuccess?.();
          onClose();
        } else {
          setError('NFT minted but registration failed — contact support');
        }
      } else if (result.status === 'cancelled') {
        setError('Payment cancelled');
      } else {
        setError(`Mint failed: ${result.message ?? 'unknown'}`);
      }
    } catch (err) {
      console.error('[handleMint]', err);
      setError('Mint failed — please try again');
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
        background: '#0d0d14', borderTop: '1px solid #7b6bc820',
        borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#ffffff20' }} />
        </div>

        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🎨</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 }}>
          {step === 'upload' ? 'Upload NFT Image' : 'NFT Details'}
        </div>
        <div style={{ fontSize: 12, color: '#4a4a5a', textAlign: 'center', marginBottom: 24 }}>
          {step === 'upload' ? 'Max 4MB — JPEG, PNG, GIF, WEBP' : 'Add name and description'}
        </div>

        {step === 'upload' && (
          <>
            <label style={{
              display: 'block', width: '100%',
              border: `2px dashed ${file ? '#7b6bc840' : '#ffffff20'}`,
              borderRadius: 16, padding: '24px',
              textAlign: 'center', cursor: 'pointer',
              background: '#0a0a12', marginBottom: 16,
              boxSizing: 'border-box',
            }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {preview ? (
                <img src={preview} alt="preview"
                  style={{ maxHeight: 200, borderRadius: 12, maxWidth: '100%' }} />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📸</div>
                  <div style={{ fontSize: 13, color: '#6b6b7a' }}>Tap to choose image</div>
                  <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 4 }}>Max 4MB</div>
                </>
              )}
            </label>

            {error && (
              <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button onClick={handleUpload} disabled={!file || loading} style={{
              width: '100%', padding: '16px',
              background: file ? 'linear-gradient(135deg,#2d1b69,#1a0f3d)' : '#ffffff10',
              border: file ? '1px solid #7b6bc840' : 'none',
              borderRadius: 16,
              color: file ? '#b39ddb' : '#4a4a5a',
              fontSize: 15, fontWeight: 800,
              cursor: file ? 'pointer' : 'default',
            }}>
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
          </>
        )}

        {step === 'details' && (
          <>
            {preview && (
              <img src={preview} alt="nft" style={{
                width: 120, height: 120, objectFit: 'cover',
                borderRadius: 16, display: 'block',
                margin: '0 auto 20px',
                border: '2px solid #7b6bc840',
              }} />
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>NFT NAME *</div>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Awesome NFT" autoFocus
                style={{
                  width: '100%', background: '#0a0a12',
                  border: '1px solid #7b6bc840', borderRadius: 14,
                  padding: '12px 16px', color: '#fff', fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>DESCRIPTION</div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your NFT..." rows={2}
                style={{
                  width: '100%', background: '#0a0a12',
                  border: '1px solid #ffffff10', borderRadius: 14,
                  padding: '12px 16px', color: '#fff', fontSize: 13,
                  outline: 'none', resize: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{
              padding: '12px 16px', background: '#ffffff05',
              borderRadius: 12, border: '1px solid #ffffff08', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b6b7a' }}>Minting Fee</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#d4af37' }}>{MINT_FEE}π</span>
              </div>
            </div>

            {error && (
              <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button onClick={handleMint} disabled={!name || loading} style={{
              width: '100%', padding: '16px',
              background: name ? 'linear-gradient(135deg,#2d1b69,#1a0f3d)' : '#ffffff10',
              border: name ? '1px solid #7b6bc840' : 'none',
              borderRadius: 16,
              color: name ? '#b39ddb' : '#4a4a5a',
              fontSize: 15, fontWeight: 800,
              cursor: name ? 'pointer' : 'default',
            }}>
              {loading ? 'Processing...' : `🎨 Mint NFT for ${MINT_FEE}π`}
            </button>

            <button onClick={() => setStep('upload')} style={{
              width: '100%', padding: '14px', marginTop: 10,
              background: 'none', border: '1px solid #ffffff10',
              borderRadius: 16, color: '#4a4a5a', fontSize: 14, cursor: 'pointer',
            }}>
              ← Back
            </button>
          </>
        )}

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
