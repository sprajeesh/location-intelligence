"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import type { CategoryId, ScoreResult } from "@/types/api";
import { formatScoreValue, getScoreColorClass, parseCoverage, sortCategoriesForDisplay } from "@/utils/scoreDisplay";
import { CoverageBadge } from "@/components/CoverageBadge";
import { CategoryScoreCard } from "@/components/CategoryScoreCard";

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
      {/* Overall Score */}
      <div className="text-center">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {t("score.title", { defaultValue: "Location Score" })}
        </h3>
        <div className="flex flex-col items-center gap-1">
          <div
            className={`text-3xl font-bold ${getScoreColorClass(score.overall)} transition-colors duration-300`}
          >
            {formatScoreValue(score.overall)}
          </div>
          <CoverageBadge scored={scored} total={total} />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2 pt-2 border-t border-slate-700/30">
        {orderedCategories.map((category) => (
          <CategoryScoreCard
            key={category.category}
            category={category}
            isExpanded={expandedCategories.has(category.category)}
            onToggleExpand={() => toggleExpanded(category.category)}
          />
        ))}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="pt-2 border-t border-slate-700/30 space-y-1">
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className="text-xs text-amber-400 flex items-start gap-2"
            >
              <TriangleAlert
                className="w-3 h-3 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScoreDisplay;
