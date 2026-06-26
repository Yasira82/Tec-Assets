export function Skeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#050816', padding: '0 0 90px' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }
        .sk { animation: shimmer 1.4s ease infinite; background: #0B1020; border-radius: 14px; }
      `}</style>
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <div className="sk" style={{ width: 80, height: 28 }} />
        <div className="sk" style={{ width: 36, height: 36, borderRadius: '50%' }} />
      </div>
      <div style={{ padding: '16px 16px 0' }}>
        <div className="sk" style={{ height: 110 }} />
      </div>
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="sk" style={{ height: 76 }} />)}
      </div>
    </div>
  );
}
