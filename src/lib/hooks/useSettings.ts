'use client';

import { useState, useEffect } from 'react';

export interface TecAssetSettings {
  theme:          'dark' | 'light' | 'system';
  language:       'en' | 'ar';
  showValues:     boolean;
  currency:       'PI' | 'USD';
  defaultTab:     'all' | 'domains' | 'nfts';
  hideBalance:    boolean;
  notifyAssets:   boolean;
  notifyPrice:    boolean;
}

const DEFAULTS: TecAssetSettings = {
  theme:        'dark',
  language:     'en',
  showValues:   true,
  currency:     'PI',
  defaultTab:   'all',
  hideBalance:  false,
  notifyAssets: true,
  notifyPrice:  false,
};

const STORAGE_KEY = 'tec_assets_settings';

export function useSettings() {
  const [settings, setSettings] = useState<TecAssetSettings>(DEFAULTS);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const update = <K extends keyof TecAssetSettings>(
    key:   K,
    value: TecAssetSettings[K],
  ) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return { settings, update, reset, loaded };
}
