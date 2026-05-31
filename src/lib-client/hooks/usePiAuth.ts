'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredUser, logout as piLogout } from '@/lib-client/pi/pi-auth';
import { TecUser } from '@/types/pi.types';

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

    if (!stored) return;

    const doSilentAuth = async () => {
      try {
        if (typeof window === 'undefined' || !window.Pi) return;
        await window.Pi.authenticate(['username', 'payments'], () => {});
        (window as any).__TEC_PI_AUTHENTICATED = true;
      } catch { /* silent */ }
    };

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
