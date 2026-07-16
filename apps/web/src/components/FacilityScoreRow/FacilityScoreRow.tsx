"use client";

import { useTranslations } from "next-intl";
import type { FacilityScoreResult } from "@/types/api";
import { formatScoreValue, getScoreColorClass, resolveFacilityDisplayStatus } from "@/utils/scoreDisplay";
import { StatusPill } from "@/components/StatusPill";

/**
 * FacilityScoreRow — Renders one facility type's score breakdown within a
 * category (e.g. "Schools" under "Education"): score, status, and the
 * server-generated explanation sentence, shown verbatim.
 */

export interface FacilityScoreRowProps {
  facility: FacilityScoreResult;
}

export function FacilityScoreRow({ facility }: FacilityScoreRowProps) {
  const t = useTranslations();
  const displayStatus = resolveFacilityDisplayStatus(facility);
  const isNotChecked = displayStatus === "not_checked";

  const label = t(`score.facilityTypes.${facility.facilityType}`, {
    defaultValue: facility.facilityType,
  });

  return (
    <div
      data-testid={`facility-score-row-${facility.facilityType}`}
      data-status={displayStatus}
      className={`
        rounded-lg px-3 py-2 border
        ${isNotChecked ? "border-dashed border-slate-700/40 opacity-60" : "border-slate-700/40"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-200">{label}</span>
        <div className="flex items-center gap-2">
          {displayStatus === "not_checked" && (
            <StatusPill label={t("score.status.notAssessed", { defaultValue: "Not assessed" })} />
          )}
          {displayStatus === "no_data_found" && (
            <StatusPill label={t("score.status.noDataFound", { defaultValue: "None found nearby" })} />
          )}
          <span className={`text-sm font-semibold ${getScoreColorClass(facility.score)}`}>
            {formatScoreValue(facility.score)}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1">{facility.explanation}</p>
    </div>
  );
}

export default FacilityScoreRow;
