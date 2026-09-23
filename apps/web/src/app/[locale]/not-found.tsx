import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/NotFoundContent";

export const dynamic = 'force-dynamic';

export default async function NotFound() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <NotFoundContent
      message={t("notFound.message")}
      backHomeLabel={t("notFound.backHome")}
      homeHref={`/${locale}`}
    />
  );
}
