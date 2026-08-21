"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Car, PersonStanding, Bike } from "lucide-react";
import type { RouteTransportMode } from "@/types/api";

interface RouteModeButton {
  mode: RouteTransportMode;
  labelKey: string;
  icon: React.ReactNode;
}

export interface RouteModesSelectorProps {
  activeMode: RouteTransportMode;
  onModeChange: (mode: RouteTransportMode) => void;
}

export function RouteModeSelector({
  activeMode,
  onModeChange,
}: RouteModesSelectorProps) {
  const t = useTranslations("navigate");

  const modes: RouteModeButton[] = [
    { mode: "driving", labelKey: "driving", icon: <Car className="w-4 h-4" aria-hidden="true" /> },
    { mode: "walking", labelKey: "walking", icon: <PersonStanding className="w-4 h-4" aria-hidden="true" /> },
    { mode: "cycling", labelKey: "cycling", icon: <Bike className="w-4 h-4" aria-hidden="true" /> },
  ];

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Transport mode">
      {modes.map(({ mode, labelKey, icon }) => {
        const label = t(labelKey);
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              active:scale-[0.97]
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
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default RouteModeSelector;
