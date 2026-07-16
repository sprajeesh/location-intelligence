"use client";

import { useTranslations } from "next-intl";
import type { RouteOption } from "@/types/api";
import TurnByTurnStep from "@/components/TurnByTurnStep";
import { formatDuration, formatETA, formatDistance, getPrimaryRoad } from "@/utils/routeFormat";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

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
  const contentId = `route-option-${route.durationS}-${route.distanceM}`;

  return (
    <CollapsibleCard
      isExpanded={isExpanded}
      onToggle={onToggle}
      contentId={contentId}
      className="border-slate-700/50 overflow-hidden"
      headerClassName="items-start text-left px-4 py-3 gap-3 hover:bg-slate-700/20 transition-colors duration-150"
      header={
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {isFastest && <Badge label={t("fastest")} tone="success" />}
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
      }
    >
      {route.steps.length > 0 ? (
        <ol className="px-4 pb-3 pt-1 border-t border-slate-700/30">
          {route.steps.map((step, index) => (
            <li key={index}>
              <TurnByTurnStep step={step} index={index} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-4 pb-3 pt-2 border-t border-slate-700/30">
          <p className="text-xs text-slate-500">No step details available.</p>
        </div>
      )}
    </CollapsibleCard>
  );
}

export default RouteOptionCard;
