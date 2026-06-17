import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import '../i18n/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

interface RootLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export const metadata = {
  title: 'Location Intelligence',
  description:
    'Discover nearby facilities and neighborhood scores for any NZ address',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-50">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
