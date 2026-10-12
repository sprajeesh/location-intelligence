'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/errorReporting';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Last-resort boundary for failures in the root layout. It renders its own <html> and
 * <body> with inline styles, because the layout and its CSS may be what failed.
 *
 * This boundary sits outside the next-intl provider, so its text is English only.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    reportClientError({ kind: 'boundary', error, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '20px', margin: 0 }}>Something went wrong. Please try again.</h1>
        {/* Raw <button> on purpose: this boundary can render when the Tailwind CSS that shared Button relies on has failed to load. */}
        <button type="button" onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
