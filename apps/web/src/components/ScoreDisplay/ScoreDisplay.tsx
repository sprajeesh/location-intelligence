"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
              <svg
                className="w-3 h-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScoreDisplay;
