import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import { localizedPath } from "@/lib/localizedPath";
import { getSiteUrl } from "@/lib/siteUrl";
import { InfoPageShell } from "@/components/InfoPageShell";
import { Info, MapPin, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import { getButtonLinkClasses } from "@/components/ui/Button";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import { serializeJsonLd } from "@/lib/jsonLd";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

// Card layout on lg (3-col grid): what and limits span the row, how is wider than who.
const SECTIONS: { key: string; icon: LucideIcon; span: string }[] = [
  { key: "what", icon: MapPin, span: "lg:col-span-3" },
  { key: "who", icon: Users, span: "lg:col-span-1" },
  { key: "how", icon: SlidersHorizontal, span: "lg:col-span-2" },
  { key: "limits", icon: Info, span: "lg:col-span-3" },
];

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
    <InfoPageShell
      locale={locale}
      backHomeLabel={t("backHome")}
      title={t("title")}
      subtitle={t("subtitle")}
      icon={<Info size={24} aria-hidden="true" />}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {SECTIONS.map(({ key, icon: Icon, span }) => (
          <SurfacePanel
            as="section"
            key={key}
            className={`p-6 transition-shadow hover:shadow-card-lg md:p-8 ${span}`}
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-200"
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">{t(`${key}Title`)}</h2>
            <p className="mt-2 max-w-3xl text-slate-600">{t(`${key}Body`)}</p>
          </SurfacePanel>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-800 dark:bg-primary-950 md:p-8">
        <h2 className="text-xl font-semibold">{t("feedbackTitle")}</h2>
        <p className="mt-2 max-w-3xl text-slate-600">{t("feedbackBody")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={localizedPath(locale, "/contact")}
            className={getButtonLinkClasses("primary")}
          >
            {t("feedbackLink")}
          </Link>
          <Link href={localizedPath(locale, "/faq")} className={getButtonLinkClasses("outline")}>
            {t("faqLink")}
          </Link>
          <Link href={localizedPath(locale, "/data-sources")} className={getButtonLinkClasses("outline")}>
            {t("dataSourcesLink")}
          </Link>
        </div>
      </section>
    </InfoPageShell>
  );
}
