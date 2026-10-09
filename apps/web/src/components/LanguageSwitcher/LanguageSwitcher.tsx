"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/lib/localizedPath";

const FLAG_LABELS: Record<string, string> = { en: "EN", mi: "MI" };

// Lucide has no country flags, so the NZ flag is a small inline SVG
// (simplified: blue ensign with a Union Jack canton and the Southern Cross).
function NzFlag() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 30 15"
      width="15"
      height="8"
      className="inline-block rounded-[1px] flex-shrink-0"
    >
      <rect width="30" height="15" fill="#00247d" />
      <path d="M0 0L15 7.5M15 0L0 7.5" stroke="#fff" strokeWidth="2" />
      <path d="M0 0L15 7.5M15 0L0 7.5" stroke="#cc142b" strokeWidth="0.8" />
      <path d="M7.5 0V7.5M0 3.75H15" stroke="#fff" strokeWidth="3" />
      <path d="M7.5 0V7.5M0 3.75H15" stroke="#cc142b" strokeWidth="1.6" />
      <g fill="#cc142b" stroke="#fff" strokeWidth="0.4">
        <circle cx="24" cy="3" r="1" />
        <circle cx="21" cy="7" r="1" />
        <circle cx="27" cy="7" r="1" />
        <circle cx="24" cy="12" r="1" />
      </g>
    </svg>
  );
}

interface LanguageSwitcherProps {
  locale: string;
  label: string;
  className?: string;
  linkClassName?: string;
}

/** Strips a leading `/<locale>` segment so the same page can be linked in another locale. */
function stripLocale(pathname: string): string {
  for (const l of routing.locales) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
  }
  return pathname || "/";
}

export function LanguageSwitcher({
  locale,
  label,
  className = "",
  linkClassName = "",
}: LanguageSwitcherProps) {
  const base = stripLocale(usePathname() ?? "/");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={ref} className={`relative inline-block ${className}`.trim()}>
      <Button
        unstyled
        ariaLabel={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-x-1 ${linkClassName}`.trim()}
      >
        <NzFlag />
        {FLAG_LABELS[locale] ?? locale.toUpperCase()}
        <ChevronDown
          aria-hidden="true"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {/* Always rendered (just hidden) so the locale links stay in the markup for crawlers.
          Opens upward because the footer sits at the bottom of the viewport. */}
      <ul
        className={`${open ? "" : "hidden"} absolute bottom-full left-0 mb-1 min-w-[4.5rem] rounded-md bg-primary-700 py-1 shadow-lg z-50`}
      >
        {routing.locales.map((l) => (
          <li key={l}>
            <Link
              href={localizedPath(l, base)}
              hrefLang={l}
              lang={l}
              aria-current={l === locale ? "true" : undefined}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-x-1 px-3 py-1 hover:bg-primary-800 ${l === locale ? "font-bold" : ""} ${linkClassName}`.trim()}
            >
              <NzFlag />
              {FLAG_LABELS[l] ?? l.toUpperCase()}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
