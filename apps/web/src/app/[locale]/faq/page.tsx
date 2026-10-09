import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import Link from "next/link";
import { localizedPath } from "@/lib/localizedPath";
import { FAQ_GROUPS } from "@/lib/faqItems";
import { InfoPageShell } from "@/components/InfoPageShell";
import { ChevronDown, CircleQuestionMark } from "lucide-react";
import { getButtonLinkClasses } from "@/components/ui/Button";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
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

  const groups = FAQ_GROUPS.map((group) => ({
    key: group.key,
    items: group.items.map((key) => ({
      key,
      question: t(`items.${key}.q`),
      answer: t(`items.${key}.a`),
    })),
  }));
  const items = groups.flatMap((group) => group.items);

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
    <InfoPageShell
      locale={locale}
      backHomeLabel={t("backHome")}
      title={t("title")}
      subtitle={t("subtitle")}
      icon={<CircleQuestionMark size={24} aria-hidden="true" />}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="grid items-start gap-8 lg:grid-cols-4 lg:gap-12">
        <nav aria-label={t("topicsLabel")} className="lg:sticky lg:top-8">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {FAQ_GROUPS.map((group) => (
              <li key={group.key}>
                <a
                  href={`#${group.key}`}
                  className={`${getButtonLinkClasses("outline")} lg:w-full lg:!justify-start`}
                >
                  {t(`groups.${group.key}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10 lg:col-span-3">
          {groups.map((group) => (
            <section key={group.key} id={group.key} aria-labelledby={`${group.key}-heading`} className="scroll-mt-8">
              <h2 id={`${group.key}-heading`} className="mb-4 text-xl font-semibold">
                {t(`groups.${group.key}`)}
              </h2>
              <div className="space-y-3">
                {group.items.map(({ key, question, answer }) => (
                  <SurfacePanel
                    as="details"
                    key={key}
                    className="group open:shadow-card-lg"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 focus-ring-inset sm:px-6 [&::-webkit-details-marker]:hidden">
                      <h3 className="font-semibold">{question}</h3>
                      <ChevronDown
                        size={20}
                        aria-hidden="true"
                        className="flex-none text-primary-600 transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="px-4 pb-5 text-slate-600 sm:px-6">{answer}</p>
                  </SurfacePanel>
                ))}
              </div>
            </section>
          ))}

          <aside className="flex flex-col items-start gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-6 dark:border-primary-800 dark:bg-primary-950 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("ctaTitle")}</h2>
              <p className="mt-1 text-slate-600">{t("ctaBody")}</p>
            </div>
            <Link
              href={localizedPath(locale, "/contact")}
              className={`${getButtonLinkClasses("primary")} flex-none`}
            >
              {t("ctaLink")}
            </Link>
          </aside>
        </div>
      </div>
    </InfoPageShell>
  );
}
