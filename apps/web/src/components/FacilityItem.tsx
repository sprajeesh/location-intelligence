'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { Feature } from '@/types/api';

/**
 * FacilityItem — Single facility row in results panel.
 *
 * Displays:
 * - Facility name
 * - Distance with category indicator
 * - Clickable: centers map on facility and opens popup
 * - Hover state with subtle background
 */

export interface FacilityItemProps {
  feature: Feature;
  markerColor: string;
  onClick?: () => void;
}

export default function FacilityItem({
  feature,
  markerColor,
  onClick,
}: FacilityItemProps) {
  const t = useTranslations();

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 rounded-lg
        transition-all duration-200
        hover:bg-slate-700/30 hover:backdrop-blur-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        group
      `}
      aria-label={`${feature.name}, ${feature.distanceKm.toFixed(1)} km away`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        {/* Left: name with color indicator */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: markerColor }}
            aria-hidden="true"
          />
          <span className="text-sm text-slate-200 truncate group-hover:text-slate-100 transition-colors">
            {feature.name}
          </span>
        </div>

        {/* Right: distance */}
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300 flex-shrink-0 whitespace-nowrap ml-2">
          {t('distance.km', {
            distance: feature.distanceKm.toFixed(1),
            defaultValue: `${feature.distanceKm.toFixed(1)} km`,
          })}
        </span>
      </div>
    </button>
  );
}
