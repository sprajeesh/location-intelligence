"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert, HelpCircle } from "lucide-react";
import type { CategoryId, CategoryScoreResult, Feature, ScoreResult } from "@/types/api";
import { parseCoverage, sortCategoriesForDisplay } from "@/utils/scoreDisplay";
import { CoverageCaption } from "@/components/CoverageCaption";
import { CategoryScoreCard } from "@/components/CategoryScoreCard";
import { ScoreRing } from "@/components/ScoreRing";
import { IconButton } from "@/components/ui/IconButton";
import { useIsDesktop } from "@/hooks/useIsDesktop";

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
  // Score explanation is presented by a container (see ResultsPanel), which
  // owns the open/close state and portals ScoreExplainModal to document.body
  // -- this component only reports the click, it never renders the modal.
  onExplainOverall?: () => void;
  onExplainCategory?: (category: CategoryScoreResult) => void;
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
  onExplainOverall,
  onExplainCategory,
}: ScoreDisplayProps) {
  const t = useTranslations();
  const isDesktop = useIsDesktop();
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

  const explainButton = (
    <IconButton
      icon={HelpCircle}
      size="sm"
      onClick={() => onExplainOverall?.()}
      label={t("score.explain.openOverall", { defaultValue: "Explain the overall score" })}
      className="absolute top-2 right-2 text-white/70 hover:text-white"
    />
  );

  return (
    <div className="space-y-3">
      {/* Overall Score — the panel's focal point. Below md the bottom sheet is
          short on height, so the card becomes a compact row (ring beside the
          title and coverage) instead of a tall centered stack. */}
      {isDesktop ? (
        <div className="text-center">
          <div className="relative flex flex-col items-center gap-3 rounded-2xl surface-glass-primary py-8 transition-smooth">
            {explainButton}
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              {t("score.title", { defaultValue: "Location Score" })}
            </h3>
            <ScoreRing score={score.overall} />
            <CoverageCaption scored={scored} total={total} className="text-white/70" />
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-4 rounded-2xl surface-glass-primary p-3 transition-smooth">
          {explainButton}
          <ScoreRing
            score={score.overall}
            size={72}
            scoreClassName="text-xl font-bold text-white tabular-nums"
            unitClassName="text-[10px] font-medium text-white/70"
          />
          <div className="flex flex-col gap-1 pr-8">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              {t("score.title", { defaultValue: "Location Score" })}
            </h3>
            <CoverageCaption scored={scored} total={total} className="text-white/70" />
          </div>
        </div>
      )}

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
              onExplainCategory={onExplainCategory}
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
