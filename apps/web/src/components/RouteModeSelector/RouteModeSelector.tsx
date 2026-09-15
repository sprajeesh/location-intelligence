"use client";

import { useTranslations } from "next-intl";
import type { RouteTransportMode } from "@/types/api";
import { ROUTE_MODES } from "./routeModes";

export interface RouteModesSelectorProps {
  activeMode: RouteTransportMode | null;
  onModeChange: (mode: RouteTransportMode) => void;
  variant?: "full" | "icon";
}

export function RouteModeSelector({
  activeMode,
  onModeChange,
  variant = "full",
}: RouteModesSelectorProps) {
  const t = useTranslations("navigate");
  const isIconOnly = variant === "icon";

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Transport mode">
      {ROUTE_MODES.map(({ mode, labelKey, icon }) => {
        const label = t(labelKey);
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`
              flex items-center gap-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              active:scale-[0.97]
              ${isIconOnly ? "justify-center w-7 h-7 p-0" : "px-3 py-1.5"}
              ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm active:bg-primary-700"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200"
              }
            `}
            aria-pressed={isActive}
            aria-label={label}
          >
            {icon}
            {!isIconOnly && <span className="hidden sm:inline">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default RouteModeSelector;
