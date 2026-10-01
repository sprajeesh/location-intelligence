import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/siteUrl";
import { HomeContainer } from "@/containers/HomeContainer";
import { SiteFooter } from "@/components/SiteFooter";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

// `localePrefix: "as-needed"` (see src/i18n/routing.ts) means the default
// locale is served unprefixed — keep canonical paths in sync with that.
function canonicalPathForLocale(locale: string): string {
  return locale === routing.defaultLocale ? "/" : `/${locale}`;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  const title = t("title");
  const description = t("description");
  const path = canonicalPathForLocale(locale);

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        en: "/",
        mi: "/mi",
        "x-default": "/",
      },
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: t("siteName"),
      locale,
      type: "website",
      images: [{ url: "/og-image-1200x630.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image-1200x630.png"],
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  // JSON-LD needs absolute URLs (metadataBase only resolves <head> metadata).
  const canonicalUrl = `${getSiteUrl()}${canonicalPathForLocale(locale) === "/" ? "" : canonicalPathForLocale(locale)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${canonicalUrl}#website`,
        url: canonicalUrl,
        name: t("siteName"),
        description: t("description"),
        inLanguage: locale,
      },
      {
        "@type": "WebApplication",
        "@id": `${canonicalUrl}#webapp`,
        name: t("title"),
        description: t("description"),
        applicationCategory: "UtilityApplication",
        operatingSystem: "Any",
        url: canonicalUrl,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NZD",
        },
      },
    ],
  };

  return (
    <div className="flex flex-col w-full h-dvh overflow-hidden">
      {/* HomeContainer positions itself absolutely, so main is its relative
          slot and takes whatever height the footer leaves. */}
      <main className="relative flex-1 min-h-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <h1 className="sr-only">{t("title")}</h1>
        <HomeContainer />
      </main>
      {/* Sibling of main (not inside it) so it stays a page-level contentinfo
          landmark. mb-14 lifts it above the fixed mobile controls bar. */}
      <SiteFooter className="mb-14 md:mb-0" />
    </div>
  );
}
