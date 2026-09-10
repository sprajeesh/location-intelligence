import { ReactNode } from 'react';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/components/Providers';
import { ToastContainer } from '@/components/Toast';
import { routing } from '@/i18n/routing';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();

  // Validate locale against supported locales, fall back to default if unsupported
  const validatedLocale = routing.locales.includes(locale) ? locale : routing.defaultLocale;

  // Set lang attribute on html element with safely serialized locale value
  const langScript = `document.documentElement.lang = ${JSON.stringify(validatedLocale)};`;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
        {children}
        <ToastContainer />
      </Providers>
    </NextIntlClientProvider>
  );
}
