import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { primary } from '@/styles/tokens';
import '../i18n/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  // Resolves relative canonical/OpenGraph URLs set by route metadata (e.g.
  // src/app/[locale]/page.tsx). Set NEXT_PUBLIC_SITE_URL in production to the
  // real deployed hostname.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Location Intelligence',
  description:
    'Discover nearby facilities and neighborhood scores for any NZ address',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  // Browser-chrome metadata (address bar / task switcher tint) has to be a
  // static hex — it can't reference the CSS vars in src/i18n/globals.css,
  // which only exist once Tailwind's output CSS loads in the browser. It CAN
  // import the plain hex constant from src/styles/tokens.ts, so this stays in
  // sync automatically. `public/manifest.json`'s `theme_color`/
  // `background_color` (mirroring this value and `white` respectively) can't
  // import TS and still need the same update by hand if this ever changes.
  themeColor: primary[500],
};

// Reads the persisted theme choice and sets the `dark` class before React
// hydrates, so returning dark-mode users don't see a light-mode flash.
// Keep the localStorage key ('li-theme') in sync with THEME_STORAGE_KEY in
// src/store/index.ts.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('li-theme');if(s){var t=JSON.parse(s).state.theme;if(t==='dark')document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
