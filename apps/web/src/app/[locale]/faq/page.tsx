import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import { FAQ_ITEM_KEYS } from "@/lib/faqItems";
import { InfoPageShell } from "@/components/InfoPageShell";
import { serializeJsonLd } from "@/lib/jsonLd";

interface FaqPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return infoPageMetadata({
    locale,
    path: "/faq",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });

  const items = FAQ_ITEM_KEYS.map((key) => ({
    key,
    question: t(`items.${key}.q`),
    answer: t(`items.${key}.a`),
  }));

  // Every question/answer here is also visible on the page, as FAQPage
  // structured data requires.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <InfoPageShell locale={locale} backHomeLabel={t("backHome")}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <div className="mt-6 space-y-6">
        {items.map(({ key, question, answer }) => (
          <section key={key}>
            <h2 className="text-lg font-semibold">{question}</h2>
            <p className="mt-1 text-slate-600">{answer}</p>
          </section>
        ))}
      </div>
    </InfoPageShell>
  );
}
