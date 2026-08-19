"use client";

import { useTranslations } from "next-intl";
import { Navigation } from "lucide-react";
import type { Feature } from "@/types/api";
import { IconButton } from "@/components/ui/IconButton";

export interface FacilityItemProps {
  feature: Feature;
  markerColor: string;
  onClick?: () => void;
  onNavigate?: (feature: Feature) => void;
}

export default function FacilityItem({
  feature,
  markerColor,
  onClick,
  onNavigate,
}: FacilityItemProps) {
  const t = useTranslations();

  const rowLabel = `${feature.name}, ${feature.distanceKm.toFixed(1)} km away`;
  const rowContent = (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div
          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: markerColor }}
          aria-hidden="true"
        />
        <span className="text-sm text-slate-700 truncate group-hover:text-slate-900 transition-colors">
          {feature.name}
        </span>
      </div>
      <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-600 flex-shrink-0 whitespace-nowrap ml-2">
        {t("distance.km", {
          distance: feature.distanceKm.toFixed(1),
          defaultValue: `${feature.distanceKm.toFixed(1)} km`,
        })}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-1 group">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`
            flex-1 text-left px-3 py-2 rounded-lg
            transition-all duration-200
            hover:bg-slate-100
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
          `}
          aria-label={rowLabel}
        >
          {rowContent}
        </button>
      ) : (
        <div
          className="flex-1 text-left px-3 py-2 rounded-lg"
          aria-label={rowLabel}
        >
          {rowContent}
        </div>
      )}

      {onNavigate && (
        <IconButton
          icon={Navigation}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(feature);
          }}
          className="text-slate-400 hover:text-primary-600 hover:bg-slate-100"
          label={t("results.navigateTo", {
            name: feature.name,
            defaultValue: `Navigate to ${feature.name}`,
          })}
          title={t("results.showRoute", {
            name: feature.name,
            defaultValue: `Show route to ${feature.name}`,
          })}
        />
      )}
    </div>
  );
}
