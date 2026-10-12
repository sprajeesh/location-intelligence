'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/errorReporting';

/**
 * Reports uncaught exceptions and unhandled promise rejections for the whole app.
 * Mounted once in the root layout. Render-time errors are caught by the error
 * boundaries (app/[locale]/error.tsx and app/global-error.tsx) instead.
 */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Resource-load failures fire this event without an error object. They
      // aren't JavaScript exceptions, so skip them.
      if (!event.error) return;
      reportClientError({ kind: 'error', error: event.error });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      reportClientError({ kind: 'unhandledrejection', error: event.reason });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
