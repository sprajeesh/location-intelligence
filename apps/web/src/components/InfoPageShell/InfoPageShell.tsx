import type { ReactNode } from "react";
import Link from "next/link";
import { localizedPath } from "@/lib/localizedPath";
import { SiteFooter } from "@/components/SiteFooter";

interface InfoPageShellProps {
  locale: string;
  backHomeLabel: string;
  children: ReactNode;
}

/** Shared frame for the static info pages: back link, readable column, site footer. */
export function InfoPageShell({ locale, backHomeLabel, children }: InfoPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link
          href={localizedPath(locale, "/")}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          ← {backHomeLabel}
        </Link>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
