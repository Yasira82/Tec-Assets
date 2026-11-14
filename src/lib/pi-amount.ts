/**
 * A Pi amount as this app uses it: a number (ADR-009 — a payment request's `amount`).
 *
 * Services send an amount as a decimal string (C-71 §3: DECIMAL(20,8) in the database,
 * a string wherever an amount leaves a service); older responses send a number. Both
 * become a number here, at the BFF's edge. Anything that is not a finite amount is
 * null — never 0, which would show (or charge) a price nobody set.
 */
export function piAmount(v: unknown): number | null {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
