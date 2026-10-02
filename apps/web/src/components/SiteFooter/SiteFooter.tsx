import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedPath } from "@/lib/localizedPath";
import { version } from "../../../package.json";

// Server-rendered so the links are in the initial HTML for crawlers. Links
// are never hidden with display:none; only the plain-text credit on the right
// collapses on small screens. bg-primary-600 + white text stays >= 4.5:1 in
// both light and dark token sets (src/i18n/globals.css). The row has a fixed
// height (h-8 on mobile) because HomeContainer offsets its fixed mobile
// controls bar by exactly that much (bottom-8) — keep the two in sync. The
// version is centred absolutely and only shown at lg+, where it cannot
// collide with the links or the credit.
const LINK_CLASSES =
  "underline-offset-2 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

interface SiteFooterProps {
  /** Extra classes for the footer element. */
  className?: string;
}

export async function SiteFooter({ className = "" }: SiteFooterProps) {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const commit = process.env.APP_DEV_COMMIT;
  const versionLabel = commit ? `v${version}+${commit}` : `v${version}`;
  const year = new Date().getFullYear();

  return (
    <footer
      className={`flex-shrink-0 bg-primary-600 text-white text-xs ${className}`.trim()}
    >
      <div className="relative flex h-8 md:h-9 items-center justify-between gap-x-4 px-3 sm:px-4">
        <nav
          aria-label={t("navLabel")}
          className="flex min-w-0 items-center gap-x-2 sm:gap-x-3 whitespace-nowrap"
        >
          <span>
            <span className="sm:hidden">{t("copyrightShort", { year })}</span>
            <span className="hidden sm:inline">{t("copyright", { year })}</span>
          </span>
          <Link href={localizedPath(locale, "/about")} className={LINK_CLASSES}>
            {t("about")}
          </Link>
          <Link href={localizedPath(locale, "/faq")} className={LINK_CLASSES}>
            {t("faq")}
          </Link>
          <Link href={localizedPath(locale, "/data-sources")} className={LINK_CLASSES}>
            <span className="md:hidden">{t("dataSourcesShort")}</span>
            <span className="hidden md:inline">{t("dataSources")}</span>
          </Link>
        </nav>
        <span className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 opacity-90 lg:block">
          {versionLabel}
        </span>
        <p className="hidden sm:block">{t("dataCredit")}</p>
      </div>
    </footer>
  );
}
