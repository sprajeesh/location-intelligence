"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportButton } from "@/components/ReportButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SettingsContainer } from "@/containers/SettingsContainer";
import { Button } from "@/components/ui/Button";
import { SURFACE_PANEL_CLASSES } from "@/components/ui/SurfacePanel";
import { localizedPath } from "@/lib/localizedPath";
import { version } from "../../../package.json";

export interface MobileMenuProps {
  /** Report action; omit before an address is analyzed to hide the row. */
  report?: {
    generating: boolean;
    ready: boolean;
    disabled: boolean;
    onClick: () => void;
  };
  className?: string;
}

const ROW_CLASSES = "w-full !justify-start";
const LINK_CLASSES =
  "flex min-h-11 items-center px-3 text-sm text-ink rounded-lg hover:bg-slate-100 focus-ring-flush";

/**
 * MobileMenu — the mobile-only "⋯" overflow menu. Holds everything that is
 * not part of the search -> results -> map flow: Theme, Scoring, Report,
 * Language and the site links that the footer shows on desktop.
 *
 * Stays open when Scoring is tapped (its modal is portaled on top) so the
 * modal isn't unmounted mid-edit; closes on outside press, Escape or a link.
 */
export function MobileMenu({ report, className = "" }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const locale = useLocale();
  const t = useTranslations();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);
  const links: Array<[string, string]> = [
    ["/about", t("footer.about")],
    ["/contact", t("footer.contact")],
    ["/faq", t("footer.faq")],
    ["/data-sources", t("footer.dataSources")],
  ];

  return (
    <div ref={rootRef} className={`relative md:hidden ${className}`.trim()}>
      <Button
        icon={MoreHorizontal}
        iconOnly
        label={t("menu.more", { defaultValue: "More" })}
        variant="ghost"
        className={SURFACE_PANEL_CLASSES.chip}
        pressed={open}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
      />
      {open && (
        <div
          id={panelId}
          role="menu"
          className={`absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] p-2 flex flex-col gap-1 ${SURFACE_PANEL_CLASSES.popover}`}
        >
          <ThemeToggle className={ROW_CLASSES} />
          <SettingsContainer className={ROW_CLASSES} />
          {report && (
            <ReportButton
              generating={report.generating}
              ready={report.ready}
              disabled={report.disabled}
              onClick={report.onClick}
              fullWidth
            />
          )}
          <div className="px-3 py-1 text-sm">
            <LanguageSwitcher
              locale={locale}
              label={t("footer.language")}
              linkClassName="underline-offset-2 hover:underline"
            />
          </div>
          <nav
            aria-label={t("footer.navLabel")}
            className="mt-1 border-t border-slate-200 pt-1"
          >
            {links.map(([path, label]) => (
              <Link
                key={path}
                href={localizedPath(locale, path)}
                className={LINK_CLASSES}
                onClick={close}
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="px-3 pb-1 text-xs text-slate-500">v{version}</p>
        </div>
      )}
    </div>
  );
}

export default MobileMenu;
