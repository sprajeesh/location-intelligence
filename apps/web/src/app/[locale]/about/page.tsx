import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import { localizedPath } from "@/lib/localizedPath";
import { getSiteUrl } from "@/lib/siteUrl";
import { InfoPageShell } from "@/components/InfoPageShell";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

const SECTIONS = ["what", "who", "how", "limits"] as const;
const LINK_CLASSES = "font-medium text-primary-600 hover:underline";

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return infoPageMetadata({
    locale,
    path: "/about",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const siteUrl = getSiteUrl();

  // Describes the page and its parent site only. There is deliberately no
  // Organization/Person node: no real owner or contact details are published.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: t("metaTitle"),
    description: t("metaDescription"),
    url: `${siteUrl}${localizedPath(locale, "/about")}`,
    inLanguage: locale,
  };

  return (
    <InfoPageShell locale={locale} backHomeLabel={t("backHome")}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <div className="mt-6 space-y-6">
        {SECTIONS.map((key) => (
          <section key={key}>
            <h2 className="text-xl font-semibold">{t(`${key}Title`)}</h2>
            <p className="mt-2 text-slate-600">{t(`${key}Body`)}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href={localizedPath(locale, "/faq")} className={LINK_CLASSES}>
          {t("faqLink")}
        </Link>
        <Link href={localizedPath(locale, "/data-sources")} className={LINK_CLASSES}>
          {t("dataSourcesLink")}
        </Link>
      </p>
    </InfoPageShell>
  );
}
