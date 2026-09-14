"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import type { Feature, FacilityScoreResult } from "@/types/api";
import { formatScoreValue, getScoreColorClass, resolveFacilityDisplayStatus } from "@/utils/scoreDisplay";
import { StatusPill } from "@/components/StatusPill";
import { FacilityItem } from "@/components/FacilityItem";
import { IconButton } from "@/components/ui/IconButton";

/**
 * FacilityScoreRow — Renders one facility type's score breakdown within a
 * category (e.g. "Schools" under "Education"): score, status, and the
 * server-generated explanation sentence, shown verbatim. When the type was
 * actually assessed and matching facilities were found, the title also
 * carries a type-level marker toggle, and the individual named facilities
 * (each with their own marker toggle) are nested below.
 */

export interface FacilityScoreRowProps {
  facility: FacilityScoreResult;
  // Individual facilities of this type, nearest first. Omit (or pass an
  // empty array) when there's nothing to nest/toggle -- e.g. not_checked/
  // no-data facility types never have any.
  features?: Feature[];
  markerColor?: string;
  visibleFacilityIds?: Set<string>;
  onToggleFacilityVisibility?: (feature: Feature) => void;
  // Bulk toggle for every feature of this facility type at once (e.g. every
  // "GPs" marker). Same shape as CategoryScoreCard's category-level toggle --
  // typically the very same handler, just called with a smaller id list.
  onToggleTypeVisibility?: (featureIds: string[], makeVisible: boolean) => void;
  onFacilityClick?: (feature: Feature) => void;
  onNavigate?: (feature: Feature) => void;
}

const VISIBLE_FACILITY_LIMIT = 3;

export function FacilityScoreRow({
  facility,
  features = [],
  markerColor = "rgb(var(--color-neutral-500))",
  visibleFacilityIds,
  onToggleFacilityVisibility,
  onToggleTypeVisibility,
  onFacilityClick,
  onNavigate,
}: FacilityScoreRowProps) {
  const t = useTranslations();
  const displayStatus = resolveFacilityDisplayStatus(facility);
  const isNotChecked = displayStatus === "not_checked";

  const label = t(`score.facilityTypes.${facility.facilityType}`, {
    defaultValue: facility.facilityType,
  });

  const typeFeatureIds = useMemo(() => features.map((feature) => feature.id), [features]);
  const isTypeVisible =
    typeFeatureIds.length > 0 && typeFeatureIds.every((id) => visibleFacilityIds?.has(id));

  return (
    <div
      data-testid={`facility-score-row-${facility.facilityType}`}
      data-status={displayStatus}
      className={`
        rounded-lg px-3 py-2 border
        ${isNotChecked ? "border-dashed border-slate-200 opacity-60" : "border-slate-200"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {displayStatus === "not_checked" && (
            <StatusPill label={t("score.status.notAssessed", { defaultValue: "Not assessed" })} />
          )}
          {displayStatus === "no_data_found" && (
            <StatusPill label={t("score.status.noDataFound", { defaultValue: "None found nearby" })} />
          )}
          {!isNotChecked && (
            <span className={`text-sm font-semibold ${getScoreColorClass(facility.score)}`}>
              {formatScoreValue(facility.score)}
            </span>
          )}
          {onToggleTypeVisibility && displayStatus === "scored" && typeFeatureIds.length > 0 && (
            <IconButton
              icon={isTypeVisible ? Eye : EyeOff}
              size="sm"
              pressed={isTypeVisible}
              onClick={() => onToggleTypeVisibility(typeFeatureIds, !isTypeVisible)}
              label={`${isTypeVisible ? "Hide" : "Show"} ${label} markers on map`}
              title={`${isTypeVisible ? "Hide" : "Show"} markers`}
              className={
                isTypeVisible
                  ? "text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                  : "text-slate-400 hover:text-slate-500 hover:bg-slate-100"
              }
            />
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1">{facility.explanation}</p>

      {displayStatus === "scored" && features.length > 0 && (
        <ul className="space-y-1 mt-2">
          {features.slice(0, VISIBLE_FACILITY_LIMIT).map((feature) => (
            <li key={feature.id}>
              <FacilityItem
                feature={feature}
                markerColor={markerColor}
                isVisible={visibleFacilityIds?.has(feature.id) ?? false}
                onToggleVisibility={
                  onToggleFacilityVisibility
                    ? (e) => {
                        e.stopPropagation();
                        onToggleFacilityVisibility(feature);
                      }
                    : undefined
                }
                onClick={onFacilityClick ? () => onFacilityClick(feature) : undefined}
                onNavigate={onNavigate}
              />
            </li>
          ))}
          {features.length > VISIBLE_FACILITY_LIMIT && (
            <li className="px-3 py-1 text-xs text-slate-400">
              +{features.length - VISIBLE_FACILITY_LIMIT} more nearby
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default FacilityScoreRow;
