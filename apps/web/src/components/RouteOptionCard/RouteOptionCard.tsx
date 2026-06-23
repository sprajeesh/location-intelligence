"use client";

import { useTranslations } from "next-intl";
import type { RouteOption } from "@/types/api";
import TurnByTurnStep from "@/components/TurnByTurnStep";
import { formatDuration, formatETA, formatDistance, getPrimaryRoad } from "@/utils/routeFormat";

export interface RouteOptionCardProps {
  route: RouteOption;
  isExpanded: boolean;
  isFastest?: boolean;
  onToggle: () => void;
}

export function RouteOptionCard({
  route,
  isExpanded,
  isFastest,
  onToggle,
}: RouteOptionCardProps) {
  const t = useTranslations("navigate");

  return (
    <div className="rounded-lg border border-slate-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-700/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {isFastest && (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                {t("fastest")}
              </span>
            )}
            <span className="text-xs text-slate-400 truncate">
              {t("via")} {getPrimaryRoad(route.summary)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base font-semibold text-slate-100">
              {formatDuration(route.durationS)}
            </span>
            {route.distanceM > 0 && (
              <span className="text-xs text-slate-500">
                {formatDistance(route.distanceM)}
              </span>
            )}
          </div>
          {route.durationS > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {t("arrives")} {formatETA(route.durationS)}
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && route.steps.length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-700/30">
          {route.steps.map((step, index) => (
            <TurnByTurnStep key={index} step={step} index={index} />
          ))}
        </div>
      )}

      {isExpanded && route.steps.length === 0 && (
        <div className="px-4 pb-3 pt-2 border-t border-slate-700/30">
          <p className="text-xs text-slate-500">No step details available.</p>
        </div>
      )}
    </div>
  );
}

export default RouteOptionCard;
