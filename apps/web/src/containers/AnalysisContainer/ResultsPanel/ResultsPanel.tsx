"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search, FileText } from "lucide-react";
import { useLocationStore } from "@/store/index";
import type { Feature } from "@/types/api";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ScoreDisplay from "@/components/ScoreDisplay";
import { RadiusAdjuster } from "@/components/RadiusAdjuster";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import { useNavigate } from "@/hooks/useNavigate";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useAnalyzeCategories } from "@/hooks/useAnalyzeCategories";
import { useAnalyzeCategoryWeights } from "@/hooks/useAnalyzeCategoryWeights";
import { useCategoryColorMap } from "@/hooks/useCategoryColorMap";

/**
 * ResultsPanel — Left side panel (desktop) or bottom sheet (mobile).
 *
 * Features:
 * - Score display with coverage and per-category, per-facility breakdown
 * - Toggle to show/hide markers on the map, at category level (every
 *   assessed facility in the category at once) or per individual facility
 * - Click a facility to center the map and open its popup
 * - Loading skeletons while analyzing
 * - Empty state with option to increase radius
 * - Responsive (desktop panel left / mobile bottom sheet)
 */

export interface ResultsPanelProps {
  // Optional callback when a facility is clicked
  onFacilityClick?: (feature: Feature) => void;
  // Optional custom className for the container
  className?: string;
}

export default function ResultsPanel({
  onFacilityClick,
  className = "",
}: ResultsPanelProps) {
  const t = useTranslations();

  // Store state
  const {
    analysisResult,
    isAnalyzing,
    radiusKm,
    visibleFacilityIds,
    toggleFacilityVisibility,
    setFacilitiesVisibility,
    setActiveRoute,
    setSelectedFeature,
    selectedAddress,
    distanceMode,
    setRadiusKm,
    setAnalysisResult,
    clearVisibleFacilityIds,
    setIsMapViewOnMobile,
  } = useLocationStore();

  const { mutate: analyze } = useAnalyze();
  const analyzeCategories = useAnalyzeCategories();
  const analyzeCategoryWeights = useAnalyzeCategoryWeights();
  const categoryColorMap = useCategoryColorMap();

  // On mobile, showing a marker switches from the results panel to the
  // full-screen map so the newly-shown pin is actually visible.
  const switchToMapViewOnMobile = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMapViewOnMobile(true);
    }
  }, [setIsMapViewOnMobile]);

  // Toggle a single facility's marker
  const handleToggleFacilityVisibility = useCallback(
    (feature: Feature) => {
      const isCurrentlyHidden = !visibleFacilityIds.has(feature.id);
      toggleFacilityVisibility(feature.id);
      if (isCurrentlyHidden) switchToMapViewOnMobile();
    },
    [toggleFacilityVisibility, visibleFacilityIds, switchToMapViewOnMobile],
  );

  // Bulk-toggle every assessed facility in a category at once
  const handleToggleCategoryVisibility = useCallback(
    (featureIds: string[], makeVisible: boolean) => {
      setFacilitiesVisibility(featureIds, makeVisible);
      if (makeVisible) switchToMapViewOnMobile();
    },
    [setFacilitiesVisibility, switchToMapViewOnMobile],
  );

  // Handle facility click
  const handleFacilityClick = useCallback(
    (feature: Feature) => {
      setSelectedFeature(feature);
      setActiveRoute(null);
      onFacilityClick?.(feature);
    },
    [onFacilityClick, setSelectedFeature, setActiveRoute],
  );

  const navigate = useNavigate();

  // Re-run the analysis at a user-adjusted radius for the current address
  const handleRadiusSearch = useCallback(
    (newRadius: number) => {
      setRadiusKm(newRadius);
      setAnalysisResult(null);
      clearVisibleFacilityIds();

      if (selectedAddress) {
        analyze({
          address: selectedAddress.displayName,
          lat: selectedAddress.lat,
          lon: selectedAddress.lon,
          radiusKm: newRadius,
          distanceMode,
          categories: analyzeCategories,
          categoryWeights: analyzeCategoryWeights,
        });
      }
    },
    [
      selectedAddress,
      distanceMode,
      setRadiusKm,
      setAnalysisResult,
      clearVisibleFacilityIds,
      analyze,
      analyzeCategories,
      analyzeCategoryWeights,
    ],
  );

  // Remount the adjuster (collapsing it and resetting its draft value) whenever the address changes
  const addressKey = selectedAddress
    ? `${selectedAddress.lat},${selectedAddress.lon}`
    : "no-address";

  // Render loading state
  if (isAnalyzing) {
    return (
      <SurfacePanel variant="sidebar" className={`w-full h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 ${className}`}>
        <LoadingSkeleton count={3} />
      </SurfacePanel>
    );
  }

  // Render no analysis state
  if (!analysisResult) {
    return (
      <SurfacePanel
        variant="sidebar"
        className={`w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center ${className}`}
      >
        <div className="text-slate-400">
          <Search className="mx-auto h-12 w-12 mb-2 opacity-50" />
        </div>
        <p className="text-sm text-slate-600">
          {t("results.searchPrompt", {
            defaultValue: "Search an address to get started",
          })}
        </p>
      </SurfacePanel>
    );
  }

  // Render fully-empty results state -- no score AND no facilities. When a
  // score exists, fall through to the Score panel below, which surfaces
  // per-category/per-facility-type "none found nearby" status on its own.
  if (analysisResult.features.length === 0 && !analysisResult.score) {
    return (
      <SurfacePanel
        variant="sidebar"
        className={`w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center ${className}`}
      >
        <div className="text-slate-400">
          <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
        </div>
        <p className="text-sm text-slate-600">
          {t("results.noFacilities", {
            radius: radiusKm,
            defaultValue: `No facilities found within ${radiusKm}km. Try increasing your search radius.`,
          })}
        </p>
        <div className="w-full mt-2">
          <RadiusAdjuster
            key={addressKey}
            initialValue={radiusKm}
            defaultExpanded
            disabled={isAnalyzing}
            onSearch={handleRadiusSearch}
          />
        </div>
      </SurfacePanel>
    );
  }

  // Render results
  return (
    <SurfacePanel
      key={addressKey}
      as="section"
      variant="sidebar"
      aria-label={t("results.title")}
      className={`w-full h-full overflow-hidden flex flex-col animate-panel-in ${className}`}
    >
      {/* Score -- the only part that scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
        {analysisResult?.score && (
          <ScoreDisplay
            score={analysisResult.score}
            warnings={analysisResult.warnings}
            features={analysisResult.features}
            categoryColorMap={categoryColorMap}
            visibleFacilityIds={visibleFacilityIds}
            onToggleFacilityVisibility={handleToggleFacilityVisibility}
            onToggleCategoryVisibility={handleToggleCategoryVisibility}
            onFacilityClick={handleFacilityClick}
            onNavigate={navigate}
          />
        )}
      </div>

      {/* Radius adjuster — persistent, visible below the score */}
      <div className="flex-shrink-0 border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
        <RadiusAdjuster
          key={addressKey}
          initialValue={radiusKm}
          disabled={isAnalyzing}
          onSearch={handleRadiusSearch}
        />
      </div>
    </SurfacePanel>
  );
}
