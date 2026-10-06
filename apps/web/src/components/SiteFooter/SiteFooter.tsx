import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedPath } from "@/lib/localizedPath";
import { version } from "../../../package.json";

// Server-rendered so the links are in the initial HTML for crawlers.
// Layout: Logo | App Name + Caption (2 lines) | Links with dividers | Version
// bg-primary-600 + white text stays >= 4.5:1 in both light and dark.
// Fixed height (h-10 md:h-11) because HomeContainer offsets by that amount.
const LINK_CLASSES =
  "underline-offset-2 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const DIVIDER = " | ";

interface SiteFooterProps {
  /** Extra classes for the footer element. */
  className?: string;
}

export async function SiteFooter({ className = "" }: SiteFooterProps) {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const commit = process.env.APP_DEV_COMMIT;
  const versionLabel = commit ? `v${version}+${commit}` : `v${version}`;

  return (
    <footer
      className={`flex-shrink-0 bg-primary-600 text-white text-xs ${className}`.trim()}
    >
      <div className="flex h-10 md:h-11 items-center justify-between gap-x-4 px-3 sm:px-4">
        {/* Logo Column */}
        <div className="flex-shrink-0 relative">
          <div className="absolute inset-0 bg-white rounded-full opacity-20"></div>
          <Image
            src="/logo-mark.svg"
            alt=""
            width={24}
            height={28}
            className="h-7 w-auto relative filter brightness-0 invert"
          />
        </div>

        {/* App Name + Caption (2 lines) */}
        <div className="flex flex-col min-w-0 gap-y-0.5">
          <span className="font-bold text-xs uppercase truncate">
            {t("appName")}
          </span>
          <span className="text-[10px] italic opacity-75 truncate">
            {t("appCaption")}
          </span>
        </div>

        {/* Links Navigation */}
        <nav
          aria-label={t("navLabel")}
          className="flex flex-1 items-center gap-x-0 whitespace-nowrap min-w-0 justify-center"
        >
          <Link href={localizedPath(locale, "/about")} className={LINK_CLASSES}>
            {t("about")}
          </Link>
          <span className="opacity-50 px-1">{DIVIDER}</span>
          <Link href={localizedPath(locale, "/faq")} className={LINK_CLASSES}>
            {t("faq")}
          </Link>
          <span className="opacity-50 px-1">{DIVIDER}</span>
          <Link
            href={localizedPath(locale, "/data-sources")}
            className={LINK_CLASSES}
          >
            <span className="md:hidden">{t("dataSourcesShort")}</span>
            <span className="hidden md:inline">{t("dataSources")}</span>
          </Link>
        </nav>

        {/* Version on Right */}
        <span className="flex-shrink-0 text-xs opacity-90">
          {versionLabel}
        </span>
      </div>
    </footer>
  );
}
