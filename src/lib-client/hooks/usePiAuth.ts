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
    // ✅ قرا من الـ cookie بس — مش Pi SDK
    const stored = getStoredUser();
    setState({
      user:            stored,
      isAuthenticated: !!stored,
      isLoading:       false,
      isNewUser:       false,
      error:           null,
    });
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

  // ✅ Tec-Assets = SSO only — مفيش login مباشر
  return { ...state, logout };
};
