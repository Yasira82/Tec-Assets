// The FREE plan's asset cap, checked BEFORE a new asset is paid for.
//
// The cap belongs to the Hub plan (tec-app src/lib/subscription/entitlements.ts:
// FREE → 5 assets, PRO / ENTERPRISE → unlimited) and the Hub enforced it only on
// its own routes (plan.server.ts checkAssetQuota). An NFT minted HERE went
// upload → payment → claim and never met that check: on 2026-10-03 a FREE owner
// with 65 assets minted a 66th. This is the same rule, read the same way, at
// the point before any π moves — after the payment there is nothing honest left
// to refuse.
//
// Fail policy is the Hub's: a plan that cannot be confirmed is FREE (P6 —
// never grant on doubt); an asset count that cannot be read lets the payment
// through (a backend blip must not block a legitimate buy).

import { APP_SOURCE } from '@/lib/app-source';

export const FREE_ASSET_LIMIT = 5;

export type PlanId = 'FREE' | 'PRO' | 'ENTERPRISE';
export type QuotaCheck =
  | { allowed: true }
  | { allowed: false; plan: PlanId; limit: number; owned: number };

/** A product that CREATES an asset. `domain-nft:` re-mints an asset the user already owns. */
export const createsAsset = (productId: string): boolean => productId.startsWith('nft:');

/**
 * A plan in force now — only a live ACTIVE subscription grants its plan.
 * No `app` → the Hub's TEC plan. `app` → that app's own Pro (each app's Pro is
 * its own, owner 2026-10-02), which commerce also answers PRO for the Founding
 * gift that covers every app.
 */
export async function fetchPlan(gateway: string, token: string, app?: string): Promise<PlanId> {
  if (!gateway || !token) return 'FREE';
  const query = app ? `?app=${encodeURIComponent(app)}` : '';
  try {
    const res = await fetch(`${gateway}/api/commerce/subscriptions/status${query}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache:   'no-store',
    });
    if (!res.ok) return 'FREE';
    const json = await res.json().catch(() => ({}));
    const sub  = json?.data?.subscription ?? json?.data ?? json;
    const status = String(sub?.status ?? '').toUpperCase();
    if (status && status !== 'ACTIVE') return 'FREE';
    if (sub?.isActive === false || sub?.isExpired === true) return 'FREE';
    const plan = String(sub?.plan ?? '').toUpperCase();
    return plan === 'PRO' || plan === 'ENTERPRISE' ? plan : 'FREE';
  } catch {
    return 'FREE';
  }
}

/** The Hub plan in force now. */
export const fetchHubPlan = (gateway: string, token: string): Promise<PlanId> => fetchPlan(gateway, token);

/** How many assets the user owns, or null when it cannot be read. */
export async function countOwnedAssets(gateway: string, token: string, userId: string): Promise<number | null> {
  if (!gateway || !token || !userId) return null;
  try {
    const res = await fetch(`${gateway}/api/assets/user/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const arr  = json?.data ?? json?.assets ?? json;
    return Array.isArray(arr) ? arr.length : null;
  } catch {
    return null;
  }
}

/**
 * Unlimited for a live Hub Pro OR a live Assets Pro. Assets used to read the Hub
 * plan only, so the cap told people to "upgrade in the Hub" from an app with no
 * Pro of its own — Assets Pro (the card on /app/pro) is that Pro.
 */
export async function checkAssetQuota(gateway: string, token: string, userId: string): Promise<QuotaCheck> {
  const [hub, own] = await Promise.all([
    fetchPlan(gateway, token),
    fetchPlan(gateway, token, APP_SOURCE),
  ]);
  if (hub !== 'FREE' || own !== 'FREE') return { allowed: true };
  const plan: PlanId = 'FREE';
  const owned = await countOwnedAssets(gateway, token, userId);
  if (owned === null || owned < FREE_ASSET_LIMIT) return { allowed: true };
  return { allowed: false, plan, limit: FREE_ASSET_LIMIT, owned };
}

/** The refusal, in the Hub's shape (tec-app api/assets/provision: 402 UPGRADE_REQUIRED). */
export const quotaRefusal = (q: Extract<QuotaCheck, { allowed: false }>) => ({
  error:        `Your Free plan allows up to ${q.limit} assets — you have ${q.owned}. Get Assets Pro for unlimited assets.`,
  code:         'UPGRADE_REQUIRED',
  requiredPlan: 'PRO',
  limit:        q.limit,
  owned:        q.owned,
});
