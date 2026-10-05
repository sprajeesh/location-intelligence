"use client";

import { useMemo } from "react";
import { ReportButton } from "@/components/ReportButton";
import { useAnalyzeCategories } from "@/hooks/useAnalyzeCategories";
import { useAnalyzeCategoryWeights } from "@/hooks/useAnalyzeCategoryWeights";
import { useLocationStore } from "@/store";

/**
 * ReportContainer — the primary "Report" action in the app-level controls
 * group (next to Theme / Scoring / Map). Builds the report request from the
 * analysis on screen (same address, radius, categories, weights and distance
 * mode); any change resets the button. Renders nothing until an address is
 * selected, and stays disabled while there is no finished analysis to report
 * on (so the toolbar doesn't jump around while an analysis is in flight).
 */
export interface ReportContainerProps {
  className?: string;
  /** Full labels ("Generate report") instead of the short "Report". */
  fullLabel?: boolean;
}

export function ReportContainer({ className, fullLabel }: ReportContainerProps = {}) {
  const { selectedAddress, analysisResult, isAnalyzing, radiusKm, distanceMode } =
    useLocationStore();
  const categories = useAnalyzeCategories();
  const categoryWeights = useAnalyzeCategoryWeights();

  const request = useMemo(
    () =>
      selectedAddress && analysisResult && !isAnalyzing
        ? {
            address: selectedAddress.displayName,
            lat: selectedAddress.lat,
            lon: selectedAddress.lon,
            radiusKm,
            distanceMode,
            categories,
            categoryWeights,
          }
        : null,
    [selectedAddress, analysisResult, isAnalyzing, radiusKm, distanceMode, categories, categoryWeights],
  );

  if (!selectedAddress) return null;

  return <ReportButton request={request} className={className} fullLabel={fullLabel} />;
}

export default ReportContainer;
