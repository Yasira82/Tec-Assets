'use client';

import { useState } from 'react';

const TEC_PAY_URL = 'https://tec-app-frontend.vercel.app/pay';

export function NFTUploadModal({ onClose }: { onClose: () => void }) {
  const [step,        setStep]        = useState<'upload' | 'details'>('upload');
  const [file,        setFile]        = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const MINT_FEE = 2;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError('File too large (max 10MB)'); return; }
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
      const res = await fetch('/api/bff/nft/upload', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          size:     file.size,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? 'Upload failed');
        return;
      }

      const { uploadUrl, publicUrl, key } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method:  'PUT',
        body:    file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) { setError('Failed to upload image'); return; }

      setUploadedUrl(publicUrl);
      setUploadedKey(key);
      setStep('details');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleMint = () => {
  if (!name || !uploadedUrl) return;
  const params = new URLSearchParams({
    asset_type: 'nft',
    name,
    price:      MINT_FEE.toString(),
    listing_id: `nft-mint-${Date.now()}`,
    asset_id:   `nft-${Date.now()}`,
    image_url:  uploadedUrl,  // ✅ أضف هنا
    return_url: 'https://tec-assets-app.vercel.app/app',
  });
  window.location.href = `${TEC_PAY_URL}?${params.toString()}`;
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
          {step === 'upload' ? 'Choose an image for your NFT' : 'Add name and description'}
        </div>

        {/* ── Step 1: Upload ── */}
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
                  <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 4 }}>
                    JPEG, PNG, GIF, WEBP — max 10MB
                  </div>
                </>
              )}
            </label>

            {error && (
              <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              style={{
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

        {/* ── Step 2: Details ── */}
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
              <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>
                NFT NAME *
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Awesome NFT"
                autoFocus
                style={{
                  width: '100%', background: '#0a0a12',
                  border: '1px solid #7b6bc840', borderRadius: 14,
                  padding: '12px 16px', color: '#fff', fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: 2, marginBottom: 8 }}>
                DESCRIPTION (optional)
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your NFT..."
                rows={2}
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

            <button
              onClick={handleMint}
              disabled={!name}
              style={{
                width: '100%', padding: '16px',
                background: name ? 'linear-gradient(135deg,#2d1b69,#1a0f3d)' : '#ffffff10',
                border: name ? '1px solid #7b6bc840' : 'none',
                borderRadius: 16,
                color: name ? '#b39ddb' : '#4a4a5a',
                fontSize: 15, fontWeight: 800,
                cursor: name ? 'pointer' : 'default',
              }}>
              {`🎨 Mint NFT for ${MINT_FEE}π`}
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
