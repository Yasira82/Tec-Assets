import type { Metadata } from 'next';
import Script from 'next/script';

import './globals.css';

export const metadata: Metadata = {
  title: 'TEC Assets',
  description: 'TEC Assets Platform',
};

const piInitScript = `
(function () {
  if (typeof window === 'undefined') return;

  window.__TEC_PI_READY = false;

  function bootPi() {
    try {
      if (!window.Pi) {
        return false;
      }

      if (window.__TEC_PI_INITIALIZED) {
        window.__TEC_PI_READY = true;
        return true;
      }

      window.Pi.init({
        version: '2.0',
        sandbox: false,
      });

      window.__TEC_PI_INITIALIZED = true;
      window.__TEC_PI_READY = true;

      console.log('[TEC][Pi] SDK initialized');

      return true;
    } catch (error) {
      console.error(
        '[TEC][Pi] init failed',
        error,
      );

      return false;
    }
  }

  if (bootPi()) {
    return;
  }

  let attempts = 0;

  const interval = setInterval(() => {
    attempts++;

    const ok = bootPi();

    if (ok || attempts >= 40) {
      clearInterval(interval);
    }
  }, 250);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        <Script
          id="tec-pi-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: piInitScript,
          }}
        />

        {children}
      </body>
    </html>
  );
}
