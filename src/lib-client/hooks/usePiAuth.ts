'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredUser, logout as piLogout } from '@/lib-client/pi/pi-auth';
import { TecUser } from '@/types/pi.types';
import { piVisitSignIn } from '@/lib/pi/visit-sign-in';

interface AuthState {
  user:            TecUser | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  isNewUser:       boolean;
  error:           string | null;
}

export const usePiAuth = () => {
  const [state, setState] = useState<AuthState>({
    user:            null,
    isLoading:       true,
    isAuthenticated: false,
    isNewUser:       false,
    error:           null,
  });

  useEffect(() => {
    const stored = getStoredUser();
    setState({
      user:            stored,
      isAuthenticated: !!stored,
      isLoading:       false,
      isNewUser:       false,
      error:           null,
    });

    // C-123 §3: Pi Browser stores the tec_user cookie so the SERVER sees it but
    // hides it from client JS — getStoredUser() reads null and the real Pi username
    // never appears. Resolve identity server-side via /api/auth/me and fill it in.
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.user) {
          setState((prev) => ({
            ...prev,
            user:            (prev.user ?? (d.user as TecUser)),
            isAuthenticated: true,
            isLoading:       false,
          }));
        }
      })
      .catch(() => { /* fail closed — keep cookie-derived state */ });

    if (!stored) return;

    // The shared visit sign-in: one handshake per page load, and never inside a
    // Hub-owned session (ADR-007) — the old inline call had no such check.
    const doSilentAuth = () => { void piVisitSignIn(); };

    if (window.__TEC_PI_READY) {
      doSilentAuth();
    } else {
      window.addEventListener('tec-pi-ready', doSilentAuth, { once: true });
    }
  }, []);

  const logout = useCallback(async () => {
    await piLogout();
    setState({
      user:            null,
      isAuthenticated: false,
      isLoading:       false,
      isNewUser:       false,
      error:           null,
    });
  }, []);

  return { ...state, logout };
};
