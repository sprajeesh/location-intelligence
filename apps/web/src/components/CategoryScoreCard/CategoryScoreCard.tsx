"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import type { CategoryScoreResult, Feature } from "@/types/api";
import { formatScoreValue, getScoreColorClass, resolveFacilityDisplayStatus, sortFacilitiesForDisplay } from "@/utils/scoreDisplay";
import { getScoreCategoryIcon } from "@/utils/categoryIcons";
import { FacilityScoreRow } from "@/components/FacilityScoreRow";
import { StatusPill } from "@/components/StatusPill";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { IconButton } from "@/components/ui/IconButton";

/**
 * CategoryScoreCard — Collapsible card for one of the five composite
 * categories (e.g. Education): score, coverage status, and its expandable
 * per-facility-type breakdown. Each facility-type row carries its own
 * type-level marker toggle (e.g. every "GPs" marker at once) and nests the
 * individual facilities found (each with its own marker toggle). The header
 * also carries a category-level marker toggle that shows/hides every
 * assessed facility in this category at once.
 *
 * A "not_checked" category renders with a dashed/grayed treatment and no
 * score, distinct from a "scored" category (even one that scored zero),
 * which always renders with the normal solid card and a colored score.
 */

export interface CategoryScoreCardProps {
  category: CategoryScoreResult;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // All facilities found for the address (not just this category's) --
  // filtered internally by facilityType, which is the same string domain as
  // Feature.category. Omit when there's nothing to nest/toggle.
  features?: Feature[];
  categoryColorMap?: Record<string, string>;
  visibleFacilityIds?: Set<string>;
  onToggleFacilityVisibility?: (feature: Feature) => void;
  onToggleCategoryVisibility?: (featureIds: string[], makeVisible: boolean) => void;
  onFacilityClick?: (feature: Feature) => void;
  onNavigate?: (feature: Feature) => void;
}

export function CategoryScoreCard({
  category,
  isExpanded,
  onToggleExpand,
  features = [],
  categoryColorMap = {},
  visibleFacilityIds,
  onToggleFacilityVisibility,
  onToggleCategoryVisibility,
  onFacilityClick,
  onNavigate,
}: CategoryScoreCardProps) {
  const t = useTranslations();
  const isNotChecked = category.status === "not_checked";

  const label = t(`score.categories.${category.category}`, {
    defaultValue: category.category,
  });
  const Icon = getScoreCategoryIcon(category.category);

  // Group the address's facilities by facility type once, so each row below
  // can just look up its own slice instead of re-filtering the full list.
  const featuresByType = useMemo(() => {
    const map = new Map<string, Feature[]>();
    for (const feature of features) {
      const bucket = map.get(feature.category);
      if (bucket) {
        bucket.push(feature);
      } else {
        map.set(feature.category, [feature]);
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return map;
  }, [features]);

  // Every feature belonging to an assessed (scored, with results) facility
  // type in this category -- what the category-level toggle acts on.
  const categoryFeatureIds = useMemo(
    () =>
      category.facilities
        .filter((facility) => resolveFacilityDisplayStatus(facility) === "scored")
        .flatMap((facility) => featuresByType.get(facility.facilityType) ?? [])
        .map((feature) => feature.id),
    [category.facilities, featuresByType],
  );

  const isCategoryVisible =
    categoryFeatureIds.length > 0 &&
    categoryFeatureIds.every((id) => visibleFacilityIds?.has(id));

  return (
    <CollapsibleCard
      isExpanded={isExpanded}
      onToggle={onToggleExpand}
      cardLabel={label}
      expandLabel={t("score.actions.expand", { label, defaultValue: `Expand ${label}` })}
      collapseLabel={t("score.actions.collapse", { label, defaultValue: `Collapse ${label}` })}
      contentId={`category-score-${category.category}`}
      className={isNotChecked ? "border-dashed border-slate-200 opacity-60" : "border-slate-200"}
      headerClassName="items-center"
      contentClassName="px-3 pb-3"
      wrapperProps={{
        "data-testid": `category-score-card-${category.category}`,
        "data-status": category.status,
      }}
      header={
        <span className="flex items-center gap-2 font-medium text-slate-900">
          <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
          {label}
        </span>
      }
      headerEnd={
        isNotChecked ? (
          <StatusPill label={t("score.status.notAssessed", { defaultValue: "Not assessed" })} />
        ) : (
          <span className={`text-sm font-semibold ${getScoreColorClass(category.score)}`}>
            {formatScoreValue(category.score)}
          </span>
        )
      }
      actions={
        onToggleCategoryVisibility && categoryFeatureIds.length > 0 ? (
          <IconButton
            icon={isCategoryVisible ? Eye : EyeOff}
            size="sm"
            pressed={isCategoryVisible}
            onClick={() => onToggleCategoryVisibility(categoryFeatureIds, !isCategoryVisible)}
            label={t(isCategoryVisible ? "score.markers.hide" : "score.markers.show", {
              label,
              defaultValue: `${isCategoryVisible ? "Hide" : "Show"} ${label} markers on map`,
            })}
            title={t(isCategoryVisible ? "score.markers.hideTitle" : "score.markers.showTitle", {
              defaultValue: isCategoryVisible ? "Hide markers" : "Show markers",
            })}
            className={
              isCategoryVisible
                ? "text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                : "text-slate-400 hover:text-slate-500 hover:bg-slate-100"
            }
          />
        ) : undefined
      }
    >
      <ul className="space-y-2">
        {sortFacilitiesForDisplay(category.category, category.facilities).map((facility, index) => (
          <li
            key={facility.facilityType}
            className="animate-row-in"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <FacilityScoreRow
              facility={facility}
              features={featuresByType.get(facility.facilityType)}
              markerColor={categoryColorMap[facility.facilityType]}
              visibleFacilityIds={visibleFacilityIds}
              onToggleFacilityVisibility={onToggleFacilityVisibility}
              onToggleTypeVisibility={onToggleCategoryVisibility}
              onFacilityClick={onFacilityClick}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}

export default CategoryScoreCard;
