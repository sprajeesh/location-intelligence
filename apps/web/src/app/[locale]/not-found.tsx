import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

export default async function NotFound() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white text-ink">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-slate-500">{t("message")}</p>+{" "}
        <Link
          href={`/${locale}`}
          className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
        >
          + {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
