"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import type { HazardResult, HazardType } from "@/types/hazard";
import { formatScoreValue, getScoreColorClass } from "@/utils/scoreDisplay";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

/**
 * HazardDisplay — Hazard score section, deliberately separate from
 * ScoreDisplay's facility "overall" score (see HAZARD.md: averaging hazard
 * sub-scores can hide a single catastrophic risk).
 *
 * Composite and worst-hazard are always shown side by side, never one
 * collapsing into the other, so a single severe exposure stays visible
 * even when the composite looks only moderate.
 */

export interface HazardDisplayProps {
  hazard: HazardResult;
}

export function HazardDisplay({ hazard }: HazardDisplayProps) {
  const t = useTranslations();
  const [expandedHazards, setExpandedHazards] = useState<Set<HazardType>>(new Set());

  const toggleExpanded = (hazardType: HazardType) => {
    setExpandedHazards((prev) => {
      const next = new Set(prev);
      if (next.has(hazardType)) {
        next.delete(hazardType);
      } else {
        next.add(hazardType);
      }
      return next;
    });
  };

  const severeHazardLabels = hazard.hazards
    .filter((h) => h.isSevere)
    .map((h) => h.hazardType)
    .join(", ");

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        {t("hazard.title", { defaultValue: "Hazard Score" })}
      </h3>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className={`text-2xl font-bold ${getScoreColorClass(hazard.composite)}`}>
            {formatScoreValue(hazard.composite)}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            {t("hazard.composite", { defaultValue: "Composite" })}
          </div>
        </div>
        <div>
          <div
            className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              hazard.anySevere ? "text-error-600" : getScoreColorClass(hazard.worstHazard)
            }`}
          >
            {hazard.anySevere && <TriangleAlert className="w-5 h-5" aria-hidden="true" />}
            {formatScoreValue(hazard.worstHazard)}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            {t("hazard.worstHazard", { defaultValue: "Worst hazard" })}
          </div>
        </div>
      </div>

      {hazard.anySevere && (
        <div className="flex items-center gap-2 rounded-md border border-error-200 bg-error-50 px-3 py-2">
          <TriangleAlert className="w-4 h-4 text-error-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-error-700">
            {t("hazard.severeWarning", {
              hazards: severeHazardLabels,
              defaultValue: `Severe risk: ${severeHazardLabels}`,
            })}
          </span>
        </div>
      )}

      <ul className="space-y-2 pt-2 border-t border-slate-200">
        {hazard.hazards.map((h) => (
          <li key={h.hazardType}>
            <CollapsibleCard
              isExpanded={expandedHazards.has(h.hazardType)}
              onToggle={() => toggleExpanded(h.hazardType)}
              contentId={`hazard-score-${h.hazardType}`}
              className="border-slate-200"
              contentClassName="px-3 pb-3"
              header={<span className="font-medium text-slate-900 capitalize">{h.hazardType}</span>}
              headerEnd={
                <span className={`text-sm font-semibold ${getScoreColorClass(h.score)}`}>
                  {formatScoreValue(h.score)}
                </span>
              }
            >
              <dl className="text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <dt>{t("hazard.source", { defaultValue: "Source" })}</dt>
                  <dd className="text-slate-700">{h.source}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("hazard.dataAsOf", { defaultValue: "Data as of" })}</dt>
                  <dd className="text-slate-700">{h.currencyDate}</dd>
                </div>
                {h.isProxy && (
                  <div className="flex items-center gap-1 text-warning-600 pt-1">
                    <TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <span>
                      {t("hazard.proxyLabel", {
                        defaultValue: "Proxy estimate — not authoritative source data",
                      })}
                    </span>
                  </div>
                )}
              </dl>
            </CollapsibleCard>
          </li>
        ))}
      </ul>

      <p className="text-xs text-warning-600 flex items-start gap-2 pt-2 border-t border-slate-200">
        <TriangleAlert className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>{hazard.disclaimer}</span>
      </p>
    </div>
  );
}

export default HazardDisplay;
