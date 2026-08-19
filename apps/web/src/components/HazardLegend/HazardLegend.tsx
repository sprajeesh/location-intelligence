"use client";

import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { HAZARD_COLOR_STOPS } from "@/utils/hazardColor";
import { SurfacePanel } from "@/components/ui/SurfacePanel";

/**
 * HazardLegend — Map overlay explaining the hazard layer's color scale.
 * Reads HAZARD_COLOR_STOPS directly (the same array the map layer's fill
 * function uses) so the legend and the map fill can never drift apart.
 */

export interface HazardLegendProps {
  className?: string;
}

export function HazardLegend({ className = "" }: HazardLegendProps) {
  const t = useTranslations();

  return (
    <SurfacePanel variant="panel" className={`p-3 text-xs ${className}`.trim()}>
      <div className="font-semibold text-slate-900 mb-2">
        {t("hazard.legend.title", { defaultValue: "Hazard Severity" })}
      </div>
      <div className="flex h-3 w-40 overflow-hidden rounded">
        {HAZARD_COLOR_STOPS.map((stop) => (
          <span
            key={stop.max}
            className="flex-1"
            style={{ backgroundColor: stop.color }}
            title={stop.label}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-slate-500">
        <span>{t("hazard.legend.safe", { defaultValue: "Safe" })}</span>
        <span>{t("hazard.legend.severe", { defaultValue: "Severe" })}</span>
      </div>
      <div className="flex items-center gap-1 mt-2 text-warning-600">
        <TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        <span>{t("hazard.legend.proxyNote", { defaultValue: "Illustrative proxy data — see disclaimer" })}</span>
      </div>
    </SurfacePanel>
  );
}

export default HazardLegend;
