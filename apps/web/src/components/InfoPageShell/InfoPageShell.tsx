import type { ReactNode } from "react";
import Link from "next/link";
import { localizedPath } from "@/lib/localizedPath";
import { SiteFooter } from "@/components/SiteFooter";

interface InfoPageShellProps {
  locale: string;
  backHomeLabel: string;
  /** When set, renders the branded hero band (with the page's single h1) and a wide content area. */
  title?: string;
  subtitle?: string;
  /** Decorative icon shown in a chip beside the title. */
  icon?: ReactNode;
  children: ReactNode;
}

const BACK_LINK_CLASSES =
  "text-sm font-medium text-primary-600 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

// Faint dot grid for the hero. Uses a theme var so it re-themes in dark mode.
const DOT_GRID_STYLE = {
  backgroundImage: "radial-gradient(rgb(var(--color-primary-200)) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

/**
 * Shared frame for the static info pages: back link, content column, site footer.
 * Without `title` it is the plain readable column (max-w-3xl); with `title` it adds
 * a hero band and widens the content area (max-w-6xl) for multi-column layouts.
 */
export function InfoPageShell({
  locale,
  backHomeLabel,
  title,
  subtitle,
  icon,
  children,
}: InfoPageShellProps) {
  const backLink = (
    <Link href={localizedPath(locale, "/")} className={BACK_LINK_CLASSES}>
      ← {backHomeLabel}
    </Link>
  );

  if (!title) {
    return (
      <div className="flex min-h-dvh flex-col bg-white text-ink">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {backLink}
          {children}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink">
      <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-primary-50 to-white dark:from-primary-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          style={DOT_GRID_STYLE}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
          {backLink}
          <div className="mt-4 flex items-start gap-4 md:mt-6 md:items-center">
            {icon && (
              <span
                aria-hidden="true"
                className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary-600 text-white shadow-card md:h-14 md:w-14"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
              {subtitle && (
                <p className="mt-2 max-w-2xl text-base text-slate-600 md:text-lg">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
