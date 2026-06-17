import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Middleware for next-intl
 *
 * This middleware intercepts all requests and:
 * - Detects the locale from the URL pathname (e.g., /en/..., /mi/...)
 * - Sets the locale in the request context
 * - Handles redirects for unsupported locales
 * - Provides locale context to all downstream handlers
 *
 * Routes:
 * - /en/* → English locale
 * - /mi/* → Māori locale
 * - /* → Defaults to 'en'
 */
export default createMiddleware(routing);

/**
 * Config: specify which routes the middleware applies to
 * We apply it to all routes except static assets, API routes, and Next.js internals
 */
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - api/* (API routes are not processed by this middleware)
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
