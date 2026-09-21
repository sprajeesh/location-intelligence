"use client";

import { Route, Undo2 } from "lucide-react";
import { useLocationStore } from "@/store/index";
import { useNavigate } from "@/hooks/useNavigate";
import RouteModeSelector from "@/components/RouteModeSelector";
import { IconButton } from "@/components/ui/IconButton";
import type { Feature } from "@/types/api";

export interface FacilityRouteModePickerProps {
  feature: Feature;
  onBackToResults?: () => void;
}

export function FacilityRouteModePicker({
  feature,
  onBackToResults,
}: FacilityRouteModePickerProps) {
  const { isNavigating, selectedFeature, routeMode } = useLocationStore();
  const navigate = useNavigate();

  const activeMode =
    isNavigating && selectedFeature?.id === feature.id ? routeMode : null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between gap-1">
      <RouteModeSelector
        variant="icon"
        activeMode={activeMode}
        onModeChange={(mode) => navigate(feature, mode)}
      />
      {onBackToResults && (
        <IconButton
          icon={activeMode ? Route : Undo2}
          size="sm"
          onClick={onBackToResults}
          label={activeMode ? "Show route details" : "Back to results"}
        />
      )}
    </div>
  );
}

export default FacilityRouteModePicker;
