import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

// ──── Mock health-check — must be before import of useBackendHealth ────────
const mockCheckHealth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/health-check', () => ({
  checkBackendHealth: mockCheckHealth,
}));

// ──── Import the real hook after mocks ─────────────────────────────────────
import { useBackendHealth } from '@/hooks/useBackendHealth';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockCheckHealth.mockResolvedValue({ online: true, status: 'ok', error: null });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('useBackendHealth', () => {
  it('starts with isChecking=true and online=true (assumed until checked)', () => {
    const { result } = renderHook(() => useBackendHealth());
    expect(result.current.isChecking).toBe(true);
    expect(result.current.online).toBe(true); // defaults to true before check
  });

  it('calls checkBackendHealth after 2000ms initial delay', async () => {
    renderHook(() => useBackendHealth());
    expect(mockCheckHealth).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockCheckHealth).toHaveBeenCalledOnce();
  });

  it('sets online=true after successful health check', async () => {
    mockCheckHealth.mockResolvedValue({ online: true, status: 'ok', error: null });
    const { result } = renderHook(() => useBackendHealth());
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.online).toBe(true);
    expect(result.current.isChecking).toBe(false);
  });

  it('sets online=false after failed health check', async () => {
    mockCheckHealth.mockResolvedValue({ online: false, status: 'error', error: 'Connection refused' });
    const { result } = renderHook(() => useBackendHealth());
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.online).toBe(false);
    expect(result.current.error).toBe('Connection refused');
    expect(result.current.isChecking).toBe(false);
  });

  it('recheckHealth triggers a new check', async () => {
    const { result } = renderHook(() => useBackendHealth());
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
    });
    mockCheckHealth.mockClear();
    await act(async () => {
      await result.current.recheckHealth();
    });
    expect(mockCheckHealth).toHaveBeenCalledOnce();
  });

  it('sets up interval when intervalMs > 0', async () => {
    renderHook(() => useBackendHealth(5000));
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
    });
    mockCheckHealth.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(5100);
      await Promise.resolve();
    });
    expect(mockCheckHealth).toHaveBeenCalled();
  });

  it('returns status from health check result', async () => {
    mockCheckHealth.mockResolvedValue({ online: true, status: 'degraded', error: null });
    const { result } = renderHook(() => useBackendHealth());
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('degraded');
  });
});
