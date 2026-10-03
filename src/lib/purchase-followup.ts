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

/**
 * Send a follow-up until it is settled — the screen, not the user, waits out the gap.
 *
 * A 202 used to be treated as the end: the screen reloaded the list ONCE, at once
 * or 4 s later, and when the payment's event landed after that the new NFT /
 * purchase was simply not there until the app was reopened (owner, 2026-10-03).
 * The claim is idempotent per payment (asset-service answers APPLIED with the
 * existing asset once it is delivered), so asking again is safe: this re-sends
 * while the answer is `pending`, and a request that fails outright is retried
 * the same way. It returns the first settled answer, or `pending` if the event
 * still has not landed after `attempts` tries.
 */
export async function followUntilSettled(
  send: () => Promise<Response>,
  { attempts = 10, delayMs = 2000, onWait }: { attempts?: number; delayMs?: number; onWait?: (attempt: number) => void } = {},
): Promise<FollowUp> {
  let last: FollowUp = { state: 'pending' };
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      onWait?.(i);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      last = await readFollowUp(await send());
    } catch {
      last = { state: 'pending' };          // network blip — the event still delivers it
    }
    if (last.state === 'done' || last.state === 'rejected') return last;
  }
  return last.state === 'failed' ? last : { state: 'pending' };
}
