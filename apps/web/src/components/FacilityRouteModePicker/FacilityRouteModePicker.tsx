"use client";

import { useLocationStore } from "@/store/index";
import { useNavigate } from "@/hooks/useNavigate";
import RouteModeSelector from "@/components/RouteModeSelector";
import type { Feature } from "@/types/api";

export interface FacilityRouteModePickerProps {
  feature: Feature;
}

export function FacilityRouteModePicker({
  feature,
}: FacilityRouteModePickerProps) {
  const { isNavigating, selectedFeature, routeMode } = useLocationStore();
  const navigate = useNavigate();

  const activeMode =
    isNavigating && selectedFeature?.id === feature.id ? routeMode : null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-200">
      <RouteModeSelector
        variant="icon"
        activeMode={activeMode}
        onModeChange={(mode) => navigate(feature, mode)}
      />
    </div>
  );
}

export default FacilityRouteModePicker;
