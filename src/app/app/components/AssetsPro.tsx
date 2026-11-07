'use client';

// AssetsPro — this app's own Pro (each app's Pro is its own, owner 2026-10-02).
// What it gives: no cap on assets. A FREE plan stops at 5 (asset-quota.ts); a
// live Hub Pro, a live Assets Pro or the Founding gift lifts it.
//
// Activation is commerce-service's: a completed `assets_pro_monthly` payment of
// at least the PRO floor (5π) turns it on for 30 days. This card never grants
// anything — it shows what commerce says (/api/bff/subscription) and starts the
// payment. Keeps the ADR-007 dual-mode guard.
import { useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { createPaymentRecord, createU2APayment } from '@/lib/pi-payment';
import { isHubNavigation } from '@/lib-client/pi/hub-entry';
import { hubPaymentOrigin } from '@/lib/pi-network';
import { APP_SOURCE } from '@/lib/app-source';
import { CancelProButton } from '@/components/pro/CancelProButton';

export const ASSETS_PRO = { id: 'assets_pro_monthly', name: 'Assets Pro (monthly)', price: 5 } as const;

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? 'https://hub.tecosystem.app';

/** Mode 1 — the Hub's payment modal. `/hub?pay=1` is LOCKED (C-76/ADR-007). */
const redirectToHubPayment = (): void => {
  const q = new URLSearchParams({
    pay:        '1',
    source:     APP_SOURCE,
    amount:     String(ASSETS_PRO.price),
    item:       ASSETS_PRO.id,
    memo:       ASSETS_PRO.name,
    return_url: `${window.location.origin}/app/pro`,
  });
  window.location.href = `${hubPaymentOrigin(HUB_URL)}/hub?${q.toString()}`;
};

export default function AssetsPro() {
  const [piReady, setPiReady]           = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [daysRemaining, setDays]        = useState<number | null>(null);
  const [status, setStatus]             = useState('');

  useEffect(() => {
    fetch('/api/bff/subscription', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json()).catch(() => ({}))
      .then((j: Record<string, unknown>) => {
        const d = (j?.data ?? j ?? {}) as Record<string, unknown>;
        if (typeof d.pro === 'boolean') {
          setIsSubscribed(d.pro);
          setDays(typeof d.daysRemaining === 'number' ? d.daysRemaining : null);
          return;
        }
        const s    = ((d?.subscription ?? d) ?? {}) as Record<string, unknown>;
        const end  = typeof s.current_period_end === 'string' ? new Date(s.current_period_end) : null;
        const live = s.isActive !== false && !(s.isExpired === true || (end !== null && end.getTime() < Date.now()));
        const plan = String(s.plan ?? '').toUpperCase();
        setIsSubscribed(live && (plan === 'PRO' || plan === 'ENTERPRISE'));
        setDays(typeof s.daysRemaining === 'number' ? s.daysRemaining : null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as { __TEC_PI_READY?: boolean }).__TEC_PI_READY) setPiReady(true);
    const onReady = () => setPiReady(true);
    window.addEventListener('tec-pi-ready', onReady);
    return () => window.removeEventListener('tec-pi-ready', onReady);
  }, []);

  const handleSubscribe = async () => {
    const { id, name, price } = ASSETS_PRO;

    // ── ADR-007 guard — ALWAYS before touching window.Pi ──
    if (isHubNavigation() || !(window as { Pi?: unknown }).Pi || !piReady) {
      redirectToHubPayment();   // Mode 1
      return;
    }

    // ── Mode 2: standalone Pi Browser payment ──
    setStatus('Creating payment…');
    const internalId = await createPaymentRecord(price, id, name);
    if (!internalId) { setStatus('Could not start payment.'); return; }

    setStatus('Awaiting Pi approval…');
    const result = await createU2APayment(price, name, { item_id: id, plan: 'PRO' }, internalId);
    setStatus(
      result.success ? '✅ Subscribed — Assets Pro turns on within a minute.' :
      result.status === 'cancelled' ? 'Payment cancelled.' :
      `❌ ${result.message ?? 'Payment failed.'}`,
    );
  };

  if (isSubscribed) {
    return (
      <div style={{ background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.gold }}>★ You’re on Assets Pro</div>
        <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 6 }}>
          No cap on how many assets you hold — mint as many NFTs as you like.
        </div>
        {typeof daysRemaining === 'number' && (
          <div style={{ fontSize: 12, fontWeight: daysRemaining <= 7 ? 700 : 600, color: daysRemaining <= 7 ? TEC_COLORS.gold : TEC_COLORS.subtext, marginTop: 8 }}>
            {daysRemaining <= 7 ? '⏳ ' : ''}Expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}{daysRemaining <= 7 ? ' — subscribe again to keep it (one month at a time, no auto-renewal).' : '.'}
          </div>
        )}
        <CancelProButton />
      </div>
    );
  }

  return (
    <div style={{ padding: 20, background: TEC_COLORS.surface, borderRadius: 14, border: `1px solid ${TEC_COLORS.gold}33` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ margin: 0, color: TEC_COLORS.gold, fontSize: 18 }}>Assets Pro</h2>
        <span style={{ color: TEC_COLORS.gold, fontWeight: 800 }}>π {ASSETS_PRO.price}<span style={{ opacity: 0.6, fontSize: 12, fontWeight: 500 }}>/mo</span></span>
      </div>
      <p style={{ opacity: 0.75, fontSize: 13, margin: '8px 0 14px' }}>
        The Free plan holds up to 5 assets. <strong style={{ color: TEC_COLORS.gold }}>Assets Pro has no cap</strong> —
        mint as many NFTs as you like. A Hub Pro covers this too.
      </p>
      <button
        onClick={handleSubscribe}
        style={{
          background: `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`,
          color: '#0a0800', border: 'none', borderRadius: 10,
          padding: '11px 20px', fontWeight: 700, cursor: 'pointer',
        }}>
        Subscribe with Pi
      </button>
      <p style={{ opacity: 0.5, fontSize: 11, marginTop: 10 }}>One month at a time, no auto-renewal.</p>
      {status && <p style={{ marginTop: 8, fontSize: 13 }}>{status}</p>}
    </div>
  );
}
