"use client";

import { useState, useEffect } from "react";
import { CircleAlert } from "lucide-react";
import type { RouteOption, RouteTransportMode } from "@/types/api";
import RouteModeSelector from "@/components/RouteModeSelector";
import RouteOptionCard from "@/components/RouteOptionCard";
import { SurfacePanel } from "@/components/ui/SurfacePanel";

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
    <SurfacePanel
      as="section"
      aria-label="Route"
      className="pointer-events-auto w-full h-full overflow-y-auto flex flex-col"
    >
      {/* Destination header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200 flex-shrink-0">
        <p className="text-xs text-slate-500 mb-0.5">Route to</p>
        <p className="text-sm font-semibold text-slate-900 truncate">
          {destinationName}
        </p>
      </div>

      {/* Transport mode selector */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex-shrink-0">
        <RouteModeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </div>

      {/* Route content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Finding route…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <CircleAlert
              className="w-8 h-8 text-slate-300 mb-1"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-error-600">Could not find a route.</p>
            <p className="text-xs text-slate-500">
              Try a different transport mode.
            </p>
          </div>
        )}

        {!isLoading && !error && routes && routes.length > 0 && (
          <ul className="space-y-2">
            {routes.map((route, index) => (
              <li key={index}>
                <RouteOptionCard
                  route={route}
                  isFastest={index === 0 && routes.length > 1}
                  isExpanded={expandedIndex === index}
                  onToggle={() => handleToggle(index)}
                />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !error && routes !== null && routes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-sm text-slate-500">
              No route available for this mode.
            </p>
          </div>
        )}
      </div>
    </SurfacePanel>
  );
}

export default RoutePanel;
