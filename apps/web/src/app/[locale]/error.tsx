'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { reportClientError } from '@/lib/errorReporting';
import { Button } from '@/components/ui/Button';

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
      <Button variant="primary" label={t('retry')} onClick={reset} />
    </div>
  );
}
