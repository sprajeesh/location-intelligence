"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, FileText, TriangleAlert } from "lucide-react";
import { useLocationStore } from "@/store/index";
import type { Feature } from "@/types/api";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { FacilityItem } from "@/components/FacilityItem";
import ScoreDisplay from "@/components/ScoreDisplay";
import HazardDisplay from "@/components/HazardDisplay";
import { CategoryGroup } from "@/components/CategoryGroup";
import { RadiusAdjuster } from "@/components/RadiusAdjuster";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Tabs } from "@/components/ui/Tabs";
import { useNavigate } from "@/hooks/useNavigate";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useAnalyzeCategories } from "@/hooks/useAnalyzeCategories";
import { useAnalyzeCategoryWeights } from "@/hooks/useAnalyzeCategoryWeights";

type ResultsTab = "score" | "facilities";

/**
 * ResultsPanel — Left side panel (desktop) or bottom sheet (mobile).
 *
 * Features:
 * - Groups facilities by category with collapsible headers
 * - Toggle to show/hide markers for each category on the map
 * - Click facility to center map and open popup
 * - Score display with coverage
 * - Loading skeletons while analyzing
 * - Empty state with option to increase radius
 * - Responsive (desktop panel left / mobile bottom sheet)
 */

interface CategorySection {
  id: string;
  label: string;
  color: string;
  features: Feature[];
}

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
    visibleCategories,
    toggleCategoryVisibility,
    setActiveRoute,
    setSelectedFeature,
    selectedAddress,
    distanceMode,
    setRadiusKm,
    setAnalysisResult,
    clearVisibleCategories,
  } = useLocationStore();

  const { mutate: analyze } = useAnalyze();
  const analyzeCategories = useAnalyzeCategories();
  const analyzeCategoryWeights = useAnalyzeCategoryWeights();

  // Local UI state for expanded/collapsed categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Active results tab -- defaults to Score, resets on a new search below
  const [activeTab, setActiveTab] = useState<ResultsTab>("score");

  // Hazard is tucked away (collapsed) behind the location score by default
  const [hazardExpanded, setHazardExpanded] = useState(false);

  // Group features by category
  const categorySections = useMemo<CategorySection[]>(() => {
    if (!analysisResult?.features || analysisResult.features.length === 0) {
      return [];
    }

    // Build a map of categoryId -> { features, color }
    const categoryMap = new Map<
      string,
      {
        features: Feature[];
        label: string;
        color: string;
      }
    >();

    for (const feature of analysisResult.features) {
      if (!categoryMap.has(feature.category)) {
        // Infer label from category ID (kebab-case to Title Case)
        const label =
          feature.category
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ") || feature.category;

        categoryMap.set(feature.category, {
          features: [],
          label,
          color: "rgb(var(--color-success-500))", // fallback, overridden by API-configured category color if available
        });
      }

      const cat = categoryMap.get(feature.category)!;
      cat.features.push(feature);
    }

    // Convert to array and sort by category ID for consistency
    return Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        id,
        label: data.label,
        color: data.color,
        features: data.features.sort((a, b) => a.distanceKm - b.distanceKm),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [analysisResult?.features]);

  // Toggle category expansion
  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Handle visibility toggle
  const handleToggleVisibility = useCallback(
    (categoryId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCategoryVisibility(categoryId);
    },
    [toggleCategoryVisibility],
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
      clearVisibleCategories();

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
      clearVisibleCategories,
      analyze,
      analyzeCategories,
      analyzeCategoryWeights,
    ],
  );

  // Remount the adjuster (collapsing it and resetting its draft value) whenever the address changes
  const addressKey = selectedAddress
    ? `${selectedAddress.lat},${selectedAddress.lon}`
    : "no-address";

  // A fresh search always lands back on the Score tab
  useEffect(() => {
    setActiveTab("score");
  }, [addressKey]);

  // Render loading state
  if (isAnalyzing) {
    return (
      <SurfacePanel className={`pointer-events-auto w-full h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 ${className}`}>
        <LoadingSkeleton count={3} />
      </SurfacePanel>
    );
  }

  // Render no analysis state
  if (!analysisResult) {
    return (
      <SurfacePanel
        className={`pointer-events-auto w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center ${className}`}
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
  // score exists, fall through to the tabbed view below so the Score panel
  // keeps rendering; the empty-facilities message is scoped to the
  // Facilities tab instead.
  if (categorySections.length === 0 && !analysisResult.score) {
    return (
      <SurfacePanel
        className={`pointer-events-auto w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center ${className}`}
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
        {/* Hazard Section — separate from facility score per product decision;
            still shown here since hazard lookup is independent of facility
            results (see app/api/analyze.py's Step 3 ordering) */}
        {analysisResult?.hazard && (
          <div className="w-full pt-3 border-t border-slate-200 text-left">
            <HazardDisplay hazard={analysisResult.hazard} />
          </div>
        )}
      </SurfacePanel>
    );
  }

  // Render results
  return (
    <SurfacePanel
      key={addressKey}
      as="section"
      aria-label={t("results.title")}
      className={`pointer-events-auto w-full h-full overflow-hidden flex flex-col animate-panel-in ${className}`}
    >
      <Tabs
        tabs={[
          { id: "score", label: t("results.tabs.score", { defaultValue: "Score" }) },
          { id: "facilities", label: t("results.tabs.facilities", { defaultValue: "Nearby Facilities" }) },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as ResultsTab)}
        className="flex-shrink-0 px-2"
      />

      {/* Tab content -- the only part that scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
        {activeTab === "score" && (
          <div id="panel-score" role="tabpanel" aria-labelledby="tab-score" className="space-y-3">
            {analysisResult?.score && (
              <ScoreDisplay
                score={analysisResult.score}
                warnings={analysisResult.warnings}
              />
            )}

            {/* Hazard Section — tucked away behind a collapsed disclosure so
                it doesn't compete with the location score focal point; not
                fully implemented yet (see HazardDisplay.tsx). */}
            {analysisResult?.hazard && (
              <div className="pt-3 border-t border-slate-200">
                <CollapsibleCard
                  isExpanded={hazardExpanded}
                  onToggle={() => setHazardExpanded((prev) => !prev)}
                  contentId="hazard-score-panel"
                  className="border-slate-200"
                  contentClassName="px-3 pb-3"
                  header={
                    <span className="font-medium text-slate-900">
                      {t("hazard.title", { defaultValue: "Hazard Score" })}
                    </span>
                  }
                  headerEnd={
                    analysisResult.hazard.anySevere ? (
                      <TriangleAlert
                        className="w-4 h-4 text-error-500"
                        aria-hidden="true"
                      />
                    ) : undefined
                  }
                >
                  <HazardDisplay hazard={analysisResult.hazard} hideTitle />
                </CollapsibleCard>
              </div>
            )}
          </div>
        )}

        {activeTab === "facilities" && categorySections.length === 0 && (
          <div
            id="panel-facilities"
            role="tabpanel"
            aria-labelledby="tab-facilities"
            className="flex flex-col items-center justify-center gap-2 text-center py-8"
          >
            <div className="text-slate-400">
              <FileText className="mx-auto h-10 w-10 mb-1 opacity-50" />
            </div>
            <p className="text-sm text-slate-600">
              {t("results.noFacilities", {
                radius: radiusKm,
                defaultValue: `No facilities found within ${radiusKm}km. Try increasing your search radius.`,
              })}
            </p>
          </div>
        )}

        {activeTab === "facilities" && categorySections.length > 0 && (
          <ul
            id="panel-facilities"
            role="tabpanel"
            aria-labelledby="tab-facilities"
            className="space-y-3"
          >
            {categorySections.map((section) => {
              const isExpanded = expandedCategories.has(section.id);
              const isVisible = visibleCategories.has(section.id);

              return (
                <li key={section.id}>
                  <CategoryGroup
                    id={section.id}
                    label={section.label}
                    color={section.color}
                    count={section.features.length}
                    isExpanded={isExpanded}
                    isVisible={isVisible}
                    onToggleExpand={() => toggleCategoryExpanded(section.id)}
                    onToggleVisibility={(e) =>
                      handleToggleVisibility(section.id, e)
                    }
                  >
                    {isExpanded && (
                      <ul className="space-y-2 pl-4 mt-2">
                        {section.features.slice(0, 3).map((feature) => (
                          <li key={feature.id}>
                            <FacilityItem
                              feature={feature}
                              markerColor={section.color}
                              onClick={() => handleFacilityClick(feature)}
                              onNavigate={navigate}
                            />
                          </li>
                        ))}
                        {section.features.length > 3 && (
                          <li className="px-3 py-1 text-xs text-slate-400">
                            +{section.features.length - 3} more nearby
                          </li>
                        )}
                      </ul>
                    )}
                  </CategoryGroup>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Radius adjuster — persistent, visible regardless of active tab */}
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
