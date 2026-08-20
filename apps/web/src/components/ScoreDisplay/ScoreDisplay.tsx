"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import type { CategoryId, ScoreResult } from "@/types/api";
import { parseCoverage, sortCategoriesForDisplay } from "@/utils/scoreDisplay";
import { CoverageBadge } from "@/components/CoverageBadge";
import { CategoryScoreCard } from "@/components/CategoryScoreCard";
import { ScoreRing } from "@/components/ScoreRing";

/**
 * ScoreDisplay — Shows the composite location score, coverage indicator,
 * and the five-category breakdown, plus any warnings.
 */

export interface ScoreDisplayProps {
  score: ScoreResult;
  warnings?: string[];
}

export function ScoreDisplay({ score, warnings = [] }: ScoreDisplayProps) {
  const t = useTranslations();
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryId>>(new Set());

  const { scored, total } = parseCoverage(score.coverage);
  const orderedCategories = sortCategoriesForDisplay(score.categories);

  const toggleExpanded = (category: CategoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Overall Score — the panel's focal point */}
      <div className="text-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary-600 py-8 transition-smooth">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            {t("score.title", { defaultValue: "Location Score" })}
          </h3>
          <ScoreRing score={score.overall} />
          <CoverageBadge scored={scored} total={total} className="text-white/70" />
        </div>
      </div>

      {/* Category Breakdown */}
      <ul className="space-y-2 pt-2 border-t border-slate-200">
        {orderedCategories.map((category) => (
          <li key={category.category}>
            <CategoryScoreCard
              category={category}
              isExpanded={expandedCategories.has(category.category)}
              onToggleExpand={() => toggleExpanded(category.category)}
            />
          </li>
        ))}
      </ul>

      {/* Warnings */}
      {warnings.length > 0 && (
        <ul className="pt-2 border-t border-slate-200 space-y-1">
          {warnings.map((warning, idx) => (
            <li
              key={idx}
              className="text-xs text-warning-600 flex items-start gap-2"
            >
              <TriangleAlert
                className="w-3 h-3 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ScoreDisplay;
