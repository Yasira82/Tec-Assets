/**
 * How to read the answer to a paid follow-up — buy, domain→NFT mint, NFT register.
 *
 * The asset-service delivers a purchase only against the payment's own
 * `payment.completed.v1`, which can land a moment after Pi tells the browser "paid":
 *
 *   2xx (not 202) → delivered
 *   202           → payment received, not confirmed yet — it will be delivered from
 *                   the event whether or not the browser asks again
 *   409           → the payment was refused (sold to someone else first, underpaid…);
 *                   π moved, so this is a refund, not a retry
 *   anything else → the follow-up failed; the event still delivers it if it was paid
 */
export type FollowUp =
  | { state: 'done' }
  | { state: 'pending' }
  | { state: 'rejected'; message: string }
  | { state: 'failed';   message: string };

const REASONS: Record<string, string> = {
  REJECTED_NOT_AVAILABLE: 'no longer available',
  REJECTED_UNDERPAID:     'amount below the price',
  REJECTED_BAD_PRODUCT:   'not a valid purchase',
  REJECTED_TESTNET:       'paid with Test-Pi',
};

export async function readFollowUp(res: Response): Promise<FollowUp> {
  if (res.status === 202) return { state: 'pending' };
  if (res.ok) return { state: 'done' };
  const body = await res.json().catch(() => ({})) as { outcome?: string; error?: string };
  if (res.status === 409 && body.outcome) {
    const why = REASONS[body.outcome] ?? body.outcome;
    return { state: 'rejected', message: `Payment received but not applied (${why}) — contact support for a refund` };
  }
  return { state: 'failed', message: body.error ?? `Request failed (${res.status})` };
}

export const PENDING_MESSAGE = 'Payment received — confirming. It will appear in a moment.';
