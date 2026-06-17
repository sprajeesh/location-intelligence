import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-gray-400">{t("message")}</p>+{" "}
        <Link
          href={`/${locale}`}
          className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          + {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
