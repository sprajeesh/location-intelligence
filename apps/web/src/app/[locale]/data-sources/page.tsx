import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { infoPageMetadata } from "@/lib/infoPageMetadata";
import { InfoPageShell } from "@/components/InfoPageShell";

interface DataSourcesPageProps {
  params: Promise<{ locale: string }>;
}

const SOURCE_KEYS = [
  "linzAddresses",
  "linzParcels",
  "osm",
  "osrm",
  "wikidata",
  "esri",
  "opentopomap",
] as const;

export async function generateMetadata({ params }: DataSourcesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dataSources" });
  return infoPageMetadata({
    locale,
    path: "/data-sources",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function DataSourcesPage({ params }: DataSourcesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dataSources" });

  return (
    <InfoPageShell locale={locale} backHomeLabel={t("backHome")}>
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-slate-600">{t("intro")}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="py-2 pr-4 font-semibold">{t("columns.source")}</th>
              <th scope="col" className="py-2 pr-4 font-semibold">{t("columns.usedFor")}</th>
              <th scope="col" className="py-2 font-semibold">{t("columns.licence")}</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_KEYS.map((key) => {
              const name = t(`sources.${key}.name`);
              return (
                <tr key={key} className="border-b border-slate-200 align-top">
                  <th scope="row" className="py-3 pr-4 font-medium">
                    <a
                      href={t(`sources.${key}.url`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("sourceLink", { name })}
                      className="text-primary-600 hover:underline"
                    >
                      {name}
                    </a>
                  </th>
                  <td className="py-3 pr-4 text-slate-600">{t(`sources.${key}.usedFor`)}</td>
                  <td className="py-3 whitespace-nowrap text-slate-600">{t(`sources.${key}.licence`)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">{t("attributionTitle")}</h2>
      <p className="mt-2 text-slate-600">{t("attributionBody")}</p>
    </InfoPageShell>
  );
}
