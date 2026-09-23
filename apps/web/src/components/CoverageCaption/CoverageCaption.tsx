"use client";

import { useTranslations } from "next-intl";

/**
 * CoverageCaption — Shows how many of the five categories were assessed
 * (e.g. "Based on 4 of 5 categories"). Plain caption text, not a Badge --
 * it renders inline with no pill background wherever a score is shown.
 */

export interface CoverageCaptionProps {
  scored: number;
  total: number;
  className?: string;
}

export function CoverageCaption({ scored, total, className = "text-slate-400" }: CoverageCaptionProps) {
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

export default CoverageCaption;
