'use client';

export function AssetImageViewer({
  imageUrl,
  altText,
  onClose,
}: {
  imageUrl: string;
  altText:  string;
  onClose:  () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.98)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
      }}
    >
      <img
        src={imageUrl}
        alt={altText}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          objectFit: 'contain', borderRadius: 16,
          border: '1px solid #ffffff20',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: '#ffffff15', border: '1px solid #ffffff20',
          borderRadius: '50%', width: 40, height: 40,
          color: '#fff', fontSize: 18, cursor: 'pointer',
        }}
      >
        ✕
      </button>
      <div style={{ position: 'absolute', bottom: 30, fontSize: 12, color: '#ffffff60' }}>
        Tap anywhere to close
      </div>
    </div>
  );
}
