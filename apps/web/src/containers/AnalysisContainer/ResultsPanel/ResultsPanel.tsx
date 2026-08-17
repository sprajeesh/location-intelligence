"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, FileText } from "lucide-react";
import { useLocationStore } from "@/store/index";
import type { Feature } from "@/types/api";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { FacilityItem } from "@/components/FacilityItem";
import ScoreDisplay from "@/components/ScoreDisplay";
import HazardDisplay from "@/components/HazardDisplay";
import { CategoryGroup } from "@/components/CategoryGroup";
import { RadiusAdjuster } from "@/components/RadiusAdjuster";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useNavigate } from "@/hooks/useNavigate";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useAnalyzeCategories } from "@/hooks/useAnalyzeCategories";

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
 * - Dark theme with glassmorphism
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

  // Local UI state for expanded/collapsed categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

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
          color: "#10B981", // Default green, will be overridden by API if available
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
        });
      }
    },
    [selectedAddress, distanceMode, setRadiusKm, setAnalysisResult, clearVisibleCategories, analyze, analyzeCategories],
  );

  // Remount the adjuster (collapsing it and resetting its draft value) whenever the address changes
  const addressKey = selectedAddress
    ? `${selectedAddress.lat},${selectedAddress.lon}`
    : "no-address";

  // Render loading state
  if (isAnalyzing) {
    return (
      <GlassPanel className={`pointer-events-auto w-full h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 ${className}`}>
        <LoadingSkeleton count={3} />
      </GlassPanel>
    );
  }

  // Render no analysis state
  if (!analysisResult) {
    return (
      <GlassPanel
        className={`pointer-events-auto w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center ${className}`}
      >
        <div className="text-slate-400">
          <Search className="mx-auto h-12 w-12 mb-2 opacity-50" />
        </div>
        <p className="text-sm text-slate-300">
          {t("results.searchPrompt", {
            defaultValue: "Search an address to get started",
          })}
        </p>
      </GlassPanel>
    );
  }

  // Render empty results state
  if (categorySections.length === 0) {
    return (
      <GlassPanel
        className={`pointer-events-auto w-full h-full p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center ${className}`}
      >
        <div className="text-slate-400">
          <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
        </div>
        <p className="text-sm text-slate-300">
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
          <div className="w-full pt-3 border-t border-slate-700/30 text-left">
            <HazardDisplay hazard={analysisResult.hazard} />
          </div>
        )}
      </GlassPanel>
    );
  }

  // Render results
  return (
    <GlassPanel
      as="section"
      aria-label={t("results.title")}
      className={`pointer-events-auto w-full h-full overflow-y-auto flex flex-col ${className}`}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
        {/* Category Sections */}
        <ul className="space-y-3">
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
                        <li className="px-3 py-1 text-xs text-slate-500">
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

        {/* Score Section */}
        {analysisResult?.score && (
          <div className="pt-3 border-t border-slate-700/30">
            <ScoreDisplay
              score={analysisResult.score}
              warnings={analysisResult.warnings}
            />
          </div>
        )}

        {/* Hazard Section — separate from facility score per product decision */}
        {analysisResult?.hazard && (
          <div className="pt-3 border-t border-slate-700/30">
            <HazardDisplay hazard={analysisResult.hazard} />
          </div>
        )}

        {/* Radius adjuster */}
        <div className="pt-3 border-t border-slate-700/30">
          <RadiusAdjuster
            key={addressKey}
            initialValue={radiusKm}
            disabled={isAnalyzing}
            onSearch={handleRadiusSearch}
          />
        </div>
      </div>
    </GlassPanel>
  );
}
