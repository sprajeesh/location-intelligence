'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { reportClientError } from '@/lib/errorReporting';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches render errors below the locale layout. Shows the translated message and a
 * retry button, and reports the error with its digest, which matches the server log.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors');

  useEffect(() => {
    reportClientError({ kind: 'boundary', error, digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-ink">{t('generic')}</h1>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {t('retry')}
      </button>
    </div>
  );
}
