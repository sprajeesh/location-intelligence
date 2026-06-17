import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'mi'],
  defaultLocale: 'en',
  pathPrefix: undefined,
});

// Create navigation helpers
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
