"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import type { CategoryId, Feature, ScoreResult } from "@/types/api";
import { parseCoverage, sortCategoriesForDisplay } from "@/utils/scoreDisplay";
import { CoverageCaption } from "@/components/CoverageCaption";
import { CategoryScoreCard } from "@/components/CategoryScoreCard";
import { ScoreRing } from "@/components/ScoreRing";

/**
 * ScoreDisplay — Shows the composite location score, coverage indicator,
 * and the five-category breakdown (each with a category-level marker
 * toggle and, per facility type, the individual facilities found), plus
 * any warnings.
 */

export interface ScoreDisplayProps {
  score: ScoreResult;
  warnings?: string[];
  // Nearby facilities for the address, and map-marker plumbing -- all
  // optional so ScoreDisplay still works with just a score (e.g. in tests).
  features?: Feature[];
  categoryColorMap?: Record<string, string>;
  visibleFacilityIds?: Set<string>;
  onToggleFacilityVisibility?: (feature: Feature) => void;
  onToggleCategoryVisibility?: (featureIds: string[], makeVisible: boolean) => void;
  onFacilityClick?: (feature: Feature) => void;
  onNavigate?: (feature: Feature) => void;
}

export function ScoreDisplay({
  score,
  warnings = [],
  features,
  categoryColorMap,
  visibleFacilityIds,
  onToggleFacilityVisibility,
  onToggleCategoryVisibility,
  onFacilityClick,
  onNavigate,
}: ScoreDisplayProps) {
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
        <div className="flex flex-col items-center gap-3 rounded-2xl surface-glass-primary py-8 transition-smooth">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            {t("score.title", { defaultValue: "Location Score" })}
          </h3>
          <ScoreRing score={score.overall} />
          <CoverageCaption scored={scored} total={total} className="text-white/70" />
        </div>
      </div>

      {/* Category Breakdown -- staggered entrance overlaps the tail end of
          the score ring's ~1s reveal animation (see ScoreRing.tsx). */}
      <ul className="space-y-2 pt-2 border-t border-slate-200">
        {orderedCategories.map((category, index) => (
          <li
            key={category.category}
            className="animate-row-in"
            style={{ animationDelay: `${500 + index * 100}ms` }}
          >
            <CategoryScoreCard
              category={category}
              isExpanded={expandedCategories.has(category.category)}
              onToggleExpand={() => toggleExpanded(category.category)}
              features={features}
              categoryColorMap={categoryColorMap}
              visibleFacilityIds={visibleFacilityIds}
              onToggleFacilityVisibility={onToggleFacilityVisibility}
              onToggleCategoryVisibility={onToggleCategoryVisibility}
              onFacilityClick={onFacilityClick}
              onNavigate={onNavigate}
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
