import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockGetStoredUser = vi.fn();

vi.mock('@/lib-client/pi/pi-auth', () => ({
  getStoredUser: mockGetStoredUser,
  logout:        vi.fn(),
}));

describe('usePiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loads user from cookie on mount', async () => {
    const user = { id: 'u1', piUsername: 'yas55eR82', role: 'user', subscriptionPlan: 'Free' };
    mockGetStoredUser.mockReturnValue(user);

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result }    = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.piUsername).toBe('yas55eR82');
  });

  it('sets isAuthenticated false when no cookie', async () => {
    mockGetStoredUser.mockReturnValue(null);

    const { usePiAuth } = await import('@/lib-client/hooks/usePiAuth');
    const { result }    = renderHook(() => usePiAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
