"use client";

import { useTranslations } from "next-intl";

/**
 * CoverageBadge — Shows how many of the five categories were assessed
 * (e.g. "Based on 4 of 5 categories").
 */

export interface CoverageBadgeProps {
  scored: number;
  total: number;
}

export function CoverageBadge({ scored, total }: CoverageBadgeProps) {
  const t = useTranslations();

  return (
    <p className="text-xs text-slate-400">
      {t("score.coverage", {
        count: scored,
        total,
        defaultValue: `Based on ${scored} of ${total} categories`,
      })}
    </p>
  );
}

export default CoverageBadge;
