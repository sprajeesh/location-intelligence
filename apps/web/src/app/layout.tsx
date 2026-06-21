import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '../i18n/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Location Intelligence',
  description:
    'Discover nearby facilities and neighborhood scores for any NZ address',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-50">
        {children}
      </body>
    </html>
  );
}
