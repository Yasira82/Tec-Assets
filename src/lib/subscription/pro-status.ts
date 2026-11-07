// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL Pro-status resolver (server-only) — copy nothing, import THIS.
//
// The commerce subscription status is the single source of truth for "is this
// user on Pro?". It is COMMERCE-OWNED (C-47) — an app never stores billing truth,
// it only reflects it (P5). Read it here with the session JWT; the gateway
// resolves the user server-side (never a client field, P6).
//
// ⚠️ THE CONTRACT (do not re-parse it by hand per app):
//     GET /api/commerce/subscriptions/status →
//       { success, data: { subscription: { plan, isActive, isExpired,
//                                           current_period_end, daysRemaining } } }
//
// A production incident came from re-parsing this wrong: an app read `.data.plan`
// instead of `.data.subscription.plan`, silently resolved FREE, and every
// Pro-gated feature stayed locked for paying users — and the unit test had mocked
// a FLAT shape, so it green-lit the bug. This module unwraps the envelope in ONE
// place (tolerating a flat fallback), and `pro-status.test.ts` pins it against the
// REAL nested shape. New apps: import `resolveProStatus` / `resolveProState` — do
// not hand-roll another parser.
// ─────────────────────────────────────────────────────────────────────────────

import { APP_SOURCE } from '@/lib/app-source';

const GW = process.env.API_GATEWAY_URL ?? '';

const gwHeaders = (token: string) => ({
  'Content-Type':  'application/json',
  Authorization:   `Bearer ${token}`,
  'x-request-id':  crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
});

export interface ProState {
  pro:              boolean;           // live entitlement (active + not expired + paid plan)
  plan:             string;            // 'FREE' | 'PRO' | 'ENTERPRISE'
  isExpired:        boolean;
  daysRemaining:    number | null;     // whole days left in the period, if any
  currentPeriodEnd: string | null;     // ISO, if any
  /**
   * True when this Pro is NOT this app's own purchase — the Founding gift that
   * covers every app, or a Pro bought before the per-app split. There is nothing
   * here to cancel, so <CancelProButton /> hides. Commerce reads it `false` for an
   * admin's gift, so the admin can switch the gift off in one app to test it as
   * FREE (tec-core-backend #365). Passed through as commerce says it, never guessed.
   */
  legacy:           boolean;
  /** True for the every-app gift (the Founding Pioneers' Pro) — a card can say so. */
  gift:             boolean;
}

const FREE: ProState = {
  pro: false, plan: 'FREE', isExpired: false, daysRemaining: null, currentPeriodEnd: null, legacy: false, gift: false,
};

// Unwrap the commerce envelope to the subscription object. Nested is the contract
// (`data.subscription`); a flat `data` / bare object is tolerated as a fallback so
// a shape tweak degrades instead of throwing — but the nested read is what pins Pro.
function unwrap(d: Record<string, unknown>): Record<string, unknown> {
  const root = (d.data ?? d) as Record<string, unknown>;
  return ((root.subscription ?? root) ?? {}) as Record<string, unknown>;
}

// The caller's LIVE Pro entitlement IN THIS APP (`?app=` — each app's Pro is its
// own, owner decision 2026-10-02; the Hub plan is separate) + renewal signal. Any failure → FREE (fail
// closed, P6). Reads the session token; never trusts a client-sent plan.
export async function resolveProState(token: string): Promise<ProState> {
  if (!GW || !token) return FREE;
  try {
    const res = await fetch(`${GW}/api/commerce/subscriptions/status?app=${encodeURIComponent(APP_SOURCE)}`, {
      headers: gwHeaders(token), cache: 'no-store',
    });
    if (!res.ok) return FREE;
    const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const s = unwrap(d);

    const plan       = String(s.plan ?? s.tier ?? 'FREE').toUpperCase();
    const paid       = plan !== '' && plan !== 'FREE';
    const isExpired  = s.isExpired === true;
    const end        = (s.current_period_end ?? s.currentPeriodEnd ?? s.expires_at) as string | undefined;
    const endLive    = !end || new Date(String(end)).getTime() > Date.now();
    const active     = (s.isActive === true || s.active === true || paid) && !isExpired && endLive;
    const daysLeft   = s.daysRemaining;

    return {
      pro:              paid && active,
      plan:             paid ? plan : 'FREE',
      isExpired,
      daysRemaining:    typeof daysLeft === 'number' ? daysLeft : null,
      currentPeriodEnd: end ? String(end) : null,
      legacy:           s.legacy === true,
      gift:             s.gift === true,
    };
  } catch { return FREE; }
}

// Boolean convenience for the common Pro-gate check.
export async function resolveProStatus(token: string): Promise<boolean> {
  return (await resolveProState(token)).pro;
}
