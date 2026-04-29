import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth, HealthStatus }  from '../lib/health-check';

export function useBackendHealth(intervalMs = 0) {
  const [health,     setHealth]     = useState<HealthStatus>({ online: true });
  const [isChecking, setIsChecking] = useState(false);

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

  return { ...health, isChecking, recheckHealth: check };
}
