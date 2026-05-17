import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ✅ React Fast Refresh stubs
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
  writable:     true,
  configurable: true,
  value: { authenticate: vi.fn(), createPayment: vi.fn() },
});

// ── Mock cookies ─────────────────────────────────────────
Object.defineProperty(document, 'cookie', {
  writable:     true,
  configurable: true,
  value: 'tec_access_token=test-token; tec_csrf=test-csrf; tec_user=%7B%22id%22%3A%22user-123%22%2C%22piUsername%22%3A%22testuser%22%7D',
});

// ── Mock window.location ──────────────────────────────────
Object.defineProperty(window, 'location', {
  writable:     true,
  configurable: true,
  value: { href: '', search: '', pathname: '/app' },
});

// ── Reset mocks before each test ─────────────────────────
beforeEach(() => {
  window.location.href   = '';
  window.location.search = '';
  vi.clearAllMocks();
});
