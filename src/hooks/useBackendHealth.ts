import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth, HealthStatus }  from '../lib/health-check';

export function useBackendHealth(intervalMs = 0) {
  // ✅ null = لسه ما اتفحصش — مش offline
  const [health,     setHealth]     = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true); // ✅ ابدأ بـ true

  const check = useCallback(async () => {
    setIsChecking(true);
    const result = await checkBackendHealth();
    setHealth(result);
    setIsChecking(false);
    return result;
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => check(), 2000);
    if (intervalMs > 0) {
      const id = setInterval(check, intervalMs);
      return () => { clearTimeout(initial); clearInterval(id); };
    }
    return () => clearTimeout(initial);
  }, [check, intervalMs]);

  return {
    online:       health?.online ?? true, // ✅ افترض online لحد ما يتحقق
    status:       health?.status,
    error:        health?.error,
    isChecking,
    recheckHealth: check,
  };
}
