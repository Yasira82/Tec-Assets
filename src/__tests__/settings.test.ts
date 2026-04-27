import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetModules();
  });

  it('returns default settings on first load', async () => {
    const { useSettings } = await import('@/lib/hooks/useSettings');
    const { result }      = renderHook(() => useSettings());

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.language).toBe('en');
    expect(result.current.settings.hideBalance).toBe(false);
  });

  it('updates and persists setting', async () => {
    const { useSettings } = await import('@/lib/hooks/useSettings');
    const { result }      = renderHook(() => useSettings());

    act(() => { result.current.update('theme', 'light'); });

    expect(result.current.settings.theme).toBe('light');
    const saved = JSON.parse(localStorageMock.getItem('tec_assets_settings') ?? '{}');
    expect(saved.theme).toBe('light');
  });

  it('resets to defaults', async () => {
    const { useSettings } = await import('@/lib/hooks/useSettings');
    const { result }      = renderHook(() => useSettings());

    act(() => { result.current.update('theme', 'light'); });
    act(() => { result.current.reset(); });

    expect(result.current.settings.theme).toBe('dark');
  });
});
