'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { Feature } from '@/types/api';

export interface FacilityItemProps {
  feature: Feature;
  markerColor: string;
  onClick?: () => void;
  onNavigate?: (feature: Feature) => void;
}

export default function FacilityItem({
  feature,
  markerColor,
  onClick,
  onNavigate,
}: FacilityItemProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-1 group">
      <button
        onClick={onClick}
        className={`
          flex-1 text-left px-3 py-2 rounded-lg
          transition-all duration-200
          hover:bg-slate-700/30 hover:backdrop-blur-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        `}
        aria-label={`${feature.name}, ${feature.distanceKm.toFixed(1)} km away`}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
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
          <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300 flex-shrink-0 whitespace-nowrap ml-2">
            {t('distance.km', {
              distance: feature.distanceKm.toFixed(1),
              defaultValue: `${feature.distanceKm.toFixed(1)} km`,
            })}
          </span>
        </div>
      </button>

      {onNavigate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(feature);
          }}
          className={`
            flex-shrink-0 p-1.5 rounded-lg
            text-slate-400 hover:text-blue-400
            hover:bg-slate-700/30
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500
          `}
          aria-label={`Navigate to ${feature.name}`}
          title="Show route"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      )}
    </div>
  );
}
