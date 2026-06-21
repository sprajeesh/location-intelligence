'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocationStore } from '@/store/index';
import type { Feature } from '@/types/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import FacilityItem from '@/components/FacilityItem';
import ScoreDisplay from '@/components/ScoreDisplay';
import CategoryGroup from '@/components/CategoryGroup';

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
  // Optional callback when radius should increase
  onIncreaseRadius?: () => void;
  // Optional custom className for the container
  className?: string;
}

export default function ResultsPanel({
  onFacilityClick,
  onIncreaseRadius,
  className = '',
}: ResultsPanelProps) {
  const t = useTranslations();

  // Store state
  const {
    analysisResult,
    isAnalyzing,
    radiusKm,
    visibleCategories,
    toggleCategoryVisibility,
  } = useLocationStore();

  // Local UI state for expanded/collapsed categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
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
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') || feature.category;

        categoryMap.set(feature.category, {
          features: [],
          label,
          color: '#10B981', // Default green, will be overridden by API if available
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
        features: data.features,
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
    [toggleCategoryVisibility]
  );

  // Handle facility click
  const handleFacilityClick = useCallback(
    (feature: Feature) => {
      onFacilityClick?.(feature);
    },
    [onFacilityClick]
  );

  // Handle increase radius
  const handleIncreaseRadius = useCallback(() => {
    onIncreaseRadius?.();
  }, [onIncreaseRadius]);

  // Render loading state
  if (isAnalyzing) {
    return (
      <div
        className={`
          pointer-events-auto
          w-full h-full overflow-y-auto
          bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-4 sm:p-6
          flex flex-col gap-4
          ${className}
        `}
      >
        <h2 className="text-lg font-semibold text-slate-100">
          {t('results.title')}
        </h2>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  // Render no analysis state
  if (!analysisResult) {
    return (
      <div
        className={`
          pointer-events-auto
          w-full h-full
          bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-4 sm:p-6
          flex flex-col items-center justify-center gap-4
          text-center
          ${className}
        `}
      >
        <div className="text-slate-400">
          <svg
            className="mx-auto h-12 w-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-slate-300">
          {t('results.searchPrompt', {
            defaultValue: 'Search an address to get started',
          })}
        </p>
      </div>
    );
  }

  // Render empty results state
  if (categorySections.length === 0) {
    return (
      <div
        className={`
          pointer-events-auto
          w-full h-full
          bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-4 sm:p-6
          flex flex-col items-center justify-center gap-4
          text-center
          ${className}
        `}
      >
        <div className="text-slate-400">
          <svg
            className="mx-auto h-12 w-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-slate-300">
          {t('results.noFacilities', {
            radius: radiusKm,
            defaultValue: `No facilities found within ${radiusKm}km. Try increasing your search radius.`,
          })}
        </p>
        <button
          onClick={handleIncreaseRadius}
          className={`
            mt-2 px-4 py-2 rounded-lg font-medium text-sm
            glass-dark hover:glass
            text-blue-400 hover:text-blue-300
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            focus:ring-offset-slate-950
          `}
          aria-label={t('results.increaseRadius', {
            defaultValue: 'Increase search radius',
          })}
        >
          {t('results.increaseRadius', {
            defaultValue: 'Increase Radius',
          })}
        </button>
      </div>
    );
  }

  // Render results
  return (
    <div
      className={`
        pointer-events-auto
        w-full h-full overflow-y-auto
        bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg shadow-2xl
        flex flex-col
        ${className}
      `}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur border-b border-gray-700 rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-lg font-semibold text-slate-100">
          {t('results.title', { defaultValue: 'Results' })}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
        {/* Category Sections */}
        <div className="space-y-3">
          {categorySections.map((section) => {
            const isExpanded = expandedCategories.has(section.id);
            const isVisible = visibleCategories.has(section.id);

            return (
              <CategoryGroup
                key={section.id}
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
                  <div className="space-y-2 pl-4 mt-2">
                    {section.features.slice(0, 3).map((feature) => (
                      <FacilityItem
                        key={feature.id}
                        feature={feature}
                        markerColor={section.color}
                        onClick={() => handleFacilityClick(feature)}
                      />
                    ))}
                    {section.features.length > 3 && (
                      <p className="px-3 py-1 text-xs text-slate-500">
                        +{section.features.length - 3} more nearby
                      </p>
                    )}
                  </div>
                )}
              </CategoryGroup>
            );
          })}
        </div>

        {/* Score Section */}
        {analysisResult?.score && (
          <div className="pt-3 border-t border-slate-700/30">
            <ScoreDisplay
              score={analysisResult.score}
              warnings={analysisResult.warnings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
