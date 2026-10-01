import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { localizedPath } from '@/lib/localizedPath';

interface InfoPageMetadataInput {
  locale: string;
  /** Unprefixed path of the English page, e.g. "/faq". */
  path: string;
  title: string;
  description: string;
}

/**
 * Metadata for the static info pages (/data-sources, /faq, /about). Their copy
 * is English-only for now (other locales fall back to it), so non-default
 * locales are kept out of the index and point their canonical at the English
 * page. Drop the `robots` override once real translations exist.
 */
export function infoPageMetadata({ locale, path, title, description }: InfoPageMetadataInput): Metadata {
  const isDefaultLocale = locale === routing.defaultLocale;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: isDefaultLocale ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      type: 'website',
    },
  };
}
