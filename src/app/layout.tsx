import type { Metadata } from 'next';
import { LocaleProvider }       from '@/lib/i18n';
import { BackendOfflineBanner } from '@/components/BackendOfflineBanner';

export const metadata: Metadata = {
  title:       'TEC Assets — Digital Ownership',
  description: 'Manage your Pi Network digital assets — domains, NFTs, portfolio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <style>{`
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; width: 100%; background: #020205; }
          body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
        `}</style>
      </head>
      <body>
        <LocaleProvider>
          <BackendOfflineBanner />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
