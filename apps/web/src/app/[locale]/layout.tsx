import { ReactNode } from 'react';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/components/Providers';
import { ToastContainer } from '@/components/Toast';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();

  // Set lang attribute on html element
  const langScript = `document.documentElement.lang = '${locale}';`;

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
