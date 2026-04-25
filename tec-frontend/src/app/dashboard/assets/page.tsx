<button
  onClick={() => {
    window.location.href =
      `/api/auth/sso?target=${encodeURIComponent('https://tec-assets.vercel.app')}`;
  }}
  style={{
    padding:    '12px 24px',
    background: 'linear-gradient(135deg,#d4af37,#b8882a)',
    border:     'none',
    borderRadius: 14,
    color:      '#0a0800',
    fontSize:   14,
    fontWeight: 700,
    cursor:     'pointer',
  }}>
  💎 Open Assets App
</button>
