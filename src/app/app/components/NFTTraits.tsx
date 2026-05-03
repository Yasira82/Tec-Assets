'use client';

export function NFTTraits({ metadata, colors }: {
  metadata: Record<string, unknown>;
  colors:   { border: string; status: string };
}) {
  const traits = Object.entries(metadata).filter(([key]) =>
    !['imageUrl', 'piPaymentId', 'name'].includes(key)
  );
  if (traits.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: '#4a4a5a', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>
        Traits
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {traits.map(([key, value]) => (
          <div key={key} style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${colors.border}`,
            borderRadius: 10, padding: '8px 12px', minWidth: 80,
          }}>
            <div style={{ fontSize: 9, color: colors.status, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
              {key}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{String(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
