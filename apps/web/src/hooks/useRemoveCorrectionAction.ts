"use client";

import { useLocationStore } from "@/store";
import type { Feature } from "@/types/api";
import { osmTargetFromFeatureId } from "@/utils/osmFeatureId";

/**
 * The "Report this place as closed" action for a facility's popup. Returns the handler
 * that opens the form, or null when the action should be hidden (a feature ID that is
 * not an OSM element).
 */
export function useRemoveCorrectionAction(feature: Feature): (() => void) | null {
  const startRemoveCorrection = useLocationStore((s) => s.startRemoveCorrection);
  const targetOsmId = osmTargetFromFeatureId(feature.id);
  if (!targetOsmId) return null;
  return () =>
    startRemoveCorrection({
      targetOsmId,
      facilityType: feature.category,
      lat: feature.lat,
      lon: feature.lon,
      name: feature.name,
    });
}
