import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import { localizedPath } from "@/lib/localizedPath";
import { getSiteUrl } from "@/lib/siteUrl";
import { InfoPageShell } from "@/components/InfoPageShell";
import { ContactForm } from "@/components/ContactForm";
import { serializeJsonLd } from "@/lib/jsonLd";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return infoPageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: t("metaTitle"),
    description: t("metaDescription"),
    url: `${getSiteUrl()}${localizedPath(locale, "/contact")}`,
    inLanguage: locale,
  };

  return (
    <InfoPageShell locale={locale} backHomeLabel={t("backHome")}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-3 text-slate-600">{t("caption")}</p>
        </div>
        <ContactForm />
      </div>
    </InfoPageShell>
  );
}
