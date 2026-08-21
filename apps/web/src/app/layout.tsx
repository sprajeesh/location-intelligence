import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '../i18n/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  // Resolves relative canonical/OpenGraph URLs set by route metadata (e.g.
  // src/app/[locale]/page.tsx). Set NEXT_PUBLIC_SITE_URL in production to the
  // real deployed hostname.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Location Intelligence',
  description:
    'Discover nearby facilities and neighborhood scores for any NZ address',
  icons: {
    icon: '/favicon.ico',
  },
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
