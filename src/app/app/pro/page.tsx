'use client';

import { useRouter } from 'next/navigation';
import AssetsPro from '../components/AssetsPro';

// /app/pro — Assets Pro on its own page, so the "Get Assets Pro" link from the
// mint screen lands on the card, and the Hub sends a Mode-1 payer back here.
export default function AssetsProPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100vh', background: '#050816', color: '#fff', padding: '16px' }}>
      <button
        onClick={() => router.push('/app')}
        style={{ background: 'none', border: 'none', color: '#FBBF24', fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
        ← Back
      </button>
      <AssetsPro />
    </main>
  );
}
