import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedPath } from "@/lib/localizedPath";
import { version } from "../../../package.json";

// Server-rendered so the links are in the initial HTML for crawlers.
// Layout: Logo | App Name + Caption (2 lines) | Links with dividers | Version
// Version appears on the right at all breakpoints. bg-primary-600 + white text
// stays >= 4.5:1 in both light and dark. Fixed height (h-10 md:h-11) because
// HomeContainer offsets its mobile controls bar by that amount — keep in sync.
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
      {/* Desktop Layout (md and up) */}
      <div className="hidden md:flex h-11 items-center justify-between gap-x-4 px-4 border-b border-white border-opacity-20">
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
            <span className="hidden md:inline">{t("dataSources")}</span>
          </Link>
        </nav>

        {/* Version on Right */}
        <span className="flex-shrink-0 text-xs opacity-90">
          {versionLabel}
        </span>
      </div>

      {/* Mobile Layout (below md) - 3 column grid (auto, 1fr, auto) */}
      <div className="md:hidden grid gap-2 p-2 min-h-20 border-b border-white border-opacity-20" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
        {/* Column 1: Logo */}
        <div className="flex items-center justify-center">
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-white rounded-full opacity-20"></div>
            <Image
              src="/logo-mark.svg"
              alt=""
              width={40}
              height={48}
              className="h-12 w-auto relative filter brightness-0 invert"
            />
          </div>
        </div>

        {/* Column 2: App Name, Caption, Version */}
        <div className="flex flex-col justify-center gap-y-1">
          <span className="font-bold text-[11px] uppercase leading-tight">
            {t("appName")}
          </span>
          <span className="text-xs italic opacity-75 leading-tight">
            {t("appCaption")}
          </span>
          <span className="text-[9px] opacity-90 leading-tight">
            {versionLabel}
          </span>
        </div>

        {/* Column 3: Links (Right-aligned) */}
        <nav
          aria-label={t("navLabel")}
          className="flex flex-col justify-center gap-y-0.5 text-right"
        >
          <Link href={localizedPath(locale, "/about")} className={LINK_CLASSES}>
            {t("about")}
          </Link>
          <Link href={localizedPath(locale, "/faq")} className={LINK_CLASSES}>
            {t("faq")}
          </Link>
          <Link
            href={localizedPath(locale, "/data-sources")}
            className={LINK_CLASSES}
          >
            {t("dataSources")}
          </Link>
        </nav>
      </div>

    </footer>
  );
}
