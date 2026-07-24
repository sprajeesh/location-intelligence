"use client";

import { useTranslations } from "next-intl";
import type { CategoryScoreResult } from "@/types/api";
import { formatScoreValue, getScoreColorClass, sortFacilitiesForDisplay } from "@/utils/scoreDisplay";
import { FacilityScoreRow } from "@/components/FacilityScoreRow";
import { StatusPill } from "@/components/StatusPill";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

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
    <CollapsibleCard
      isExpanded={isExpanded}
      onToggle={onToggleExpand}
      contentId={`category-score-${category.category}`}
      className={isNotChecked ? "border-dashed border-slate-700/40 opacity-60" : "border-slate-700/60"}
      headerClassName="items-center"
      contentClassName="px-3 pb-3"
      wrapperProps={{
        "data-testid": `category-score-card-${category.category}`,
        "data-status": category.status,
      }}
      header={<span className="font-medium text-slate-100">{label}</span>}
      headerEnd={
        isNotChecked ? (
          <StatusPill label={t("score.status.notAssessed", { defaultValue: "Not assessed" })} />
        ) : (
          <span className={`text-sm font-semibold ${getScoreColorClass(category.score)}`}>
            {formatScoreValue(category.score)}
          </span>
        )
      }
    >
      <ul className="space-y-2">
        {sortFacilitiesForDisplay(category.category, category.facilities).map((facility) => (
          <li key={facility.facilityType}>
            <FacilityScoreRow facility={facility} />
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}

export default CategoryScoreCard;
