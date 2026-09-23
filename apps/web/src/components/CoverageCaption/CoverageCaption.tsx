"use client";

import { useTranslations } from "next-intl";

/**
 * CoverageBadge — Shows how many of the five categories were assessed
 * (e.g. "Based on 4 of 5 categories").
 */

export interface CoverageBadgeProps {
  scored: number;
  total: number;
  className?: string;
}

export function CoverageBadge({ scored, total, className = "text-slate-400" }: CoverageBadgeProps) {
  const t = useTranslations();

  return (
    <p className={`text-xs ${className}`}>
      {t("score.coverage", {
        count: scored,
        total,
        defaultValue: `Based on ${scored} of ${total} categories`,
      })}
    </p>
  );
}

export default CoverageBadge;
