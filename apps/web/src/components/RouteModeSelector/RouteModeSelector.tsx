"use client";

import React from "react";
import { useTranslations } from "next-intl";
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

const DrivingIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
  </svg>
);

const WalkingIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
  </svg>
);

const CyclingIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4C7.4 8.8 7 9.4 7 10c0 .6.4 1.2.8 1.6l3.2 3V19H13v-5l-2.2-1.5zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
  </svg>
);

export function RouteModeSelector({
  activeMode,
  onModeChange,
}: RouteModesSelectorProps) {
  const t = useTranslations("navigate");

  const modes: RouteModeButton[] = [
    { mode: "driving", labelKey: "driving", icon: <DrivingIcon /> },
    { mode: "walking", labelKey: "walking", icon: <WalkingIcon /> },
    { mode: "cycling", labelKey: "cycling", icon: <CyclingIcon /> },
  ];

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Transport mode">
      {modes.map(({ mode, labelKey, icon }) => {
        const label = t(labelKey);
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
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
