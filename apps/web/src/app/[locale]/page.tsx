import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { HomeContainer } from "@/containers/HomeContainer";

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
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: t("siteName"),
      locale,
      type: "website",
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("title"),
    description: t("description"),
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    url: canonicalPathForLocale(locale),
  };

  return (
    <main className="relative w-full h-screen overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">{t("title")}</h1>
      <HomeContainer />
    </main>
  );
}
