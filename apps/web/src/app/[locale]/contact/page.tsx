import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import { localizedPath } from "@/lib/localizedPath";
import { getSiteUrl } from "@/lib/siteUrl";
import { InfoPageShell } from "@/components/InfoPageShell";
import { Lightbulb, Mail, MapPinned, MessageSquare, type LucideIcon } from "lucide-react";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import { ContactForm } from "@/components/ContactForm";
import { serializeJsonLd } from "@/lib/jsonLd";

const TOPICS = ["feedback", "data", "ideas"] as const;
const TOPIC_ICONS: Record<(typeof TOPICS)[number], LucideIcon> = {
  feedback: MessageSquare,
  data: MapPinned,
  ideas: Lightbulb,
};

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
    <InfoPageShell
      locale={locale}
      backHomeLabel={t("backHome")}
      title={t("title")}
      subtitle={t("caption")}
      icon={<Mail size={24} aria-hidden="true" />}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="grid items-start gap-8 lg:grid-cols-5 lg:gap-12">
        <aside className="space-y-4 lg:sticky lg:top-8 lg:col-span-2">
          <ul className="space-y-4">
            {TOPICS.map((topic) => {
              const Icon = TOPIC_ICONS[topic];
              return (
                <SurfacePanel
                  as="li"
                  key={topic}
                  className="flex gap-4 p-4 transition-shadow hover:shadow-card-lg"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-200"
                  >
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{t(`topics.${topic}.title`)}</h2>
                    <p className="mt-1 text-sm text-slate-600">{t(`topics.${topic}.body`)}</p>
                  </div>
                </SurfacePanel>
              );
            })}
          </ul>
          <p className="px-1 text-sm text-slate-600">
            {t("faqPrompt")}{" "}
            <Link
              href={localizedPath(locale, "/faq")}
              className="font-medium text-primary-600 underline-offset-2 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {t("faqLink")}
            </Link>
          </p>
        </aside>
        <SurfacePanel
          as="section"
          variant="toolbar"
          aria-labelledby="contact-form-heading"
          className="p-5 sm:p-8 lg:col-span-3"
        >
          <h2 id="contact-form-heading" className="mb-6 text-xl font-semibold">
            {t("formTitle")}
          </h2>
          <ContactForm />
        </SurfacePanel>
      </div>
    </InfoPageShell>
  );
}
