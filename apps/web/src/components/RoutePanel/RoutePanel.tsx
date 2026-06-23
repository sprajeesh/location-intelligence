"use client";

import React, { useState, useEffect } from "react";
import type { RouteOption, RouteTransportMode } from "@/types/api";
import RouteModeSelector from "@/components/RouteModeSelector";
import RouteOptionCard from "@/components/RouteOptionCard";

export interface RoutePanelProps {
  routes: RouteOption[] | null;
  activeMode: RouteTransportMode;
  isLoading: boolean;
  error: string | null;
  destinationName: string;
  onModeChange: (mode: RouteTransportMode) => void;
}

export function RoutePanel({
  routes,
  activeMode,
  isLoading,
  error,
  destinationName,
  onModeChange,
}: RoutePanelProps) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Auto-expand the fastest route (index 0) when routes or mode changes
  useEffect(() => {
    setExpandedIndex(0);
  }, [routes, activeMode]);

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? -1 : index));
  };

  return (
    <div className="pointer-events-auto w-full h-full overflow-y-auto bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-lg shadow-2xl flex flex-col">
      {/* Destination header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-700/30 flex-shrink-0">
        <p className="text-xs text-slate-400 mb-0.5">Route to</p>
        <p className="text-sm font-semibold text-slate-100 truncate">
          {destinationName}
        </p>
      </div>

      {/* Transport mode selector */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-700/30 flex-shrink-0">
        <RouteModeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </div>

      {/* Route content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Finding route…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <svg
              className="w-8 h-8 text-slate-600 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-400">Could not find a route.</p>
            <p className="text-xs text-slate-500">
              Try a different transport mode.
            </p>
          </div>
        )}

        {!isLoading && !error && routes && routes.length > 0 && (
          <div className="space-y-2">
            {routes.map((route, index) => (
              <RouteOptionCard
                key={index}
                route={route}
                isFastest={index === 0 && routes.length > 1}
                isExpanded={expandedIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>
        )}

        {!isLoading && !error && routes !== null && routes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-sm text-slate-400">
              No route available for this mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoutePanel;
