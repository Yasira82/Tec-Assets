import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ✅ Fix: React Fast Refresh stubs (not available in test env)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).$RefreshReg$ = () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).$RefreshSig$ = () => (type: unknown) => type;

// ── Mock Next.js router ───────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/app',
}));

// ── Mock Pi SDK ───────────────────────────────────────────
Object.defineProperty(window, 'Pi', {
  writable: true,
  value: { authenticate: vi.fn(), createPayment: vi.fn() },
});

// ── Mock cookies ─────────────────────────────────────────
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'tec_access_token=test-token; tec_csrf=test-csrf; tec_user=%7B%22id%22%3A%22user-123%22%2C%22piUsername%22%3A%22testuser%22%7D',
});

// ── Mock window.location ──────────────────────────────────
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '', search: '', pathname: '/app' },
});

// ── Reset mocks before each test ─────────────────────────
beforeEach(() => {
  window.location.href   = '';
  window.location.search = '';
  vi.clearAllMocks();
});
