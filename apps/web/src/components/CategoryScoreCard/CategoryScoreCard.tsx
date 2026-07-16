"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { CategoryScoreResult } from "@/types/api";
import { formatScoreValue, getScoreColorClass, sortFacilitiesForDisplay } from "@/utils/scoreDisplay";
import { FacilityScoreRow } from "@/components/FacilityScoreRow";
import { StatusPill } from "@/components/StatusPill";

/**
 * CategoryScoreCard — Collapsible card for one of the five composite
 * categories (e.g. Education): score, coverage status, and its expandable
 * per-facility-type breakdown.
 *
 * A "not_checked" category renders with a dashed/grayed treatment and no
 * score, distinct from a "scored" category (even one that scored zero),
 * which always renders with the normal solid card and a colored score.
 */

export interface CategoryScoreCardProps {
  category: CategoryScoreResult;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function CategoryScoreCard({
  category,
  isExpanded,
  onToggleExpand,
}: CategoryScoreCardProps) {
  const t = useTranslations();
  const isNotChecked = category.status === "not_checked";

  const label = t(`score.categories.${category.category}`, {
    defaultValue: category.category,
  });

  return (
    <div
      data-testid={`category-score-card-${category.category}`}
      data-status={category.status}
      className={`
        rounded-lg border
        ${isNotChecked ? "border-dashed border-slate-700/40 opacity-60" : "border-slate-700/60"}
      `}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
        aria-expanded={isExpanded}
        aria-controls={`category-score-${category.category}`}
      >
        <span className="font-medium text-slate-100">{label}</span>

        <div className="flex items-center gap-2">
          {isNotChecked ? (
            <StatusPill label={t("score.status.notAssessed", { defaultValue: "Not assessed" })} />
          ) : (
            <span className={`text-sm font-semibold ${getScoreColorClass(category.score)}`}>
              {formatScoreValue(category.score)}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded && (
        <div id={`category-score-${category.category}`} className="px-3 pb-3 space-y-2">
          {sortFacilitiesForDisplay(category.category, category.facilities).map((facility) => (
            <FacilityScoreRow key={facility.facilityType} facility={facility} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryScoreCard;
