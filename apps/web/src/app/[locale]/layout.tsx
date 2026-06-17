'use client';

import { ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import { ToastContainer } from '@/components/Toast';

interface LocaleLayoutProps {
  children: ReactNode;
}

/**
 * Locale layout wraps children with React Query and Zustand providers.
 * This is a Client Component to enable use of client-side hooks and providers.
 * The root layout handles HTML structure and next-intl setup.
 */
export default function LocaleLayout({ children }: LocaleLayoutProps) {
  return (
    <Providers>
      {children}
      <ToastContainer />
    </Providers>
  );
}
