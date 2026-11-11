const getCsrfToken = (): string =>
  document.cookie.match(/(?:^|;\s*)tec_csrf=([^;]*)/)?.[1] ?? '';

/**
 * Pi.authenticate at the moment of a tap, with a deadline.
 *
 * In a tab Pi Browser does not answer — one opened through the Hub, or any
 * Pi session another origin owns — `Pi.authenticate` never settles: no
 * resolve, no reject. The mint handlers awaited it bare, so a tap there did
 * nothing at all: no spinner, no message, no hand-off to the Hub (owner,
 * 10 Nov 2026: "Mint does nothing", while the same button paid in a tab
 * opened from Pi's own app list).
 *
 * `false` means "Pi did not sign this tab in" — the caller hands the payment
 * to the Hub (Mode 1), which is exactly what the `catch` already did for a
 * rejected sign-in. An incomplete payment Pi reports on the way is sent to
 * the server to be resolved, as pi-payment.ts does, instead of being dropped.
 */
export const TAP_AUTH_TIMEOUT_MS = 10_000;

export const authenticateAtTap = async (timeoutMs = TAP_AUTH_TIMEOUT_MS): Promise<boolean> => {
  const w = window as unknown as { Pi?: { authenticate: (s: string[], cb: (p: unknown) => void) => Promise<unknown> }; __TEC_PI_AUTHENTICATED?: boolean };
  if (w.__TEC_PI_AUTHENTICATED) return true;
  if (!w.Pi) return false;

  const onIncomplete = (incomplete: unknown) => {
    const pid = (incomplete as { identifier?: string } | null)?.identifier;
    if (!pid) return;
    fetch('/api/bff/payment/resolve-incomplete', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ pi_payment_id: pid }),
    }).catch(() => { /* the next sign-in reports it again */ });
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); });
  try {
    const ok = await Promise.race([
      w.Pi.authenticate(['username', 'payments'], onIncomplete).then(() => true as const),
      deadline,
    ]);
    if (ok) w.__TEC_PI_AUTHENTICATED = true;
    return ok;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
};
