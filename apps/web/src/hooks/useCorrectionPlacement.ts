"use client";

import { useCallback, useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { useLocationStore } from "@/store";
import { isMapChromeTarget } from "@/utils/mapCorrection";

export interface UseCorrectionPlacementResult {
  /** True while the next map click should set the location of a missing place. */
  placing: boolean;
  /** Sets the location to the map's centre (the keyboard route to a point). */
  useMapCentre: () => void;
  /** Leaves placement mode. */
  cancel: () => void;
}

/**
 * Placement mode for "Report a missing place": the next map click sets the point, Escape
 * cancels, and the cursor turns to a crosshair. Must be called inside the Leaflet map.
 */
export function useCorrectionPlacement(): UseCorrectionPlacementResult {
  const map = useMap();
  const placing = useLocationStore((s) => s.correctionMode === "placing");
  const setCorrectionPoint = useLocationStore((s) => s.setCorrectionPoint);
  const cancel = useLocationStore((s) => s.closeCorrection);

  // Clicks on the toolbar are UI, not a location, so they are ignored.
  useMapEvents({
    click(e) {
      if (!placing || isMapChromeTarget(e.originalEvent.target)) return;
      setCorrectionPoint({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });

  useEffect(() => {
    if (!placing) return;
    const container = map.getContainer();
    const previousCursor = container.style.cursor;
    container.style.cursor = "crosshair";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      container.style.cursor = previousCursor;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [placing, map, cancel]);

  const useMapCentre = useCallback(() => {
    const center = map.getCenter();
    setCorrectionPoint({ lat: center.lat, lon: center.lng });
  }, [map, setCorrectionPoint]);

  return { placing, useMapCentre, cancel };
}
