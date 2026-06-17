'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useLocationStore } from '@/store';

/**
 * DistanceToggle component
 *
 * Floating toggle to switch between Driving and Walking distance modes.
 * Features:
 * - Two-button toggle (Driving | Walking)
 * - Updates store.distanceMode when clicked
 * - Triggers re-analysis if a location is already selected
 * - Keyboard accessible with ARIA labels
 * - Smooth transitions and visual feedback
 */

export function DistanceToggle() {
  const t = useTranslations();
  const { distanceMode, setDistanceMode, selectedAddress, isAnalyzing } =
    useLocationStore();

  const handleToggle = (mode: 'driving' | 'walking') => {
    setDistanceMode(mode);
  };

  return (
    <div
      className="inline-flex items-center gap-1 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg p-1 transition-all duration-150 hover:border-gray-600"
      role="group"
      aria-label="Distance calculation mode"
    >
      {/* Driving Button */}
      <button
        onClick={() => handleToggle('driving')}
        disabled={isAnalyzing}
        aria-pressed={distanceMode === 'driving'}
        aria-label={t('distance.driving')}
        className={`px-4 py-2 text-sm font-medium rounded transition-all duration-150 flex items-center gap-2 ${
          distanceMode === 'driving'
            ? 'bg-blue-500/30 text-blue-100 border border-blue-500/50'
            : 'text-gray-400 hover:text-gray-200'
        } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        type="button"
      >
        {/* Car icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        {t('distance.driving')}
      </button>

      {/* Walking Button */}
      <button
        onClick={() => handleToggle('walking')}
        disabled={isAnalyzing}
        aria-pressed={distanceMode === 'walking'}
        aria-label={t('distance.walking')}
        className={`px-4 py-2 text-sm font-medium rounded transition-all duration-150 flex items-center gap-2 ${
          distanceMode === 'walking'
            ? 'bg-amber-500/30 text-amber-100 border border-amber-500/50'
            : 'text-gray-400 hover:text-gray-200'
        } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        type="button"
      >
        {/* Walking icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14l9-5-8 12-4-3"
          />
        </svg>
        {t('distance.walking')}
      </button>

      {/* Visual indicator for selected mode */}
      {selectedAddress && (
        <div className="ml-1 px-2 py-1 text-xs text-gray-500 bg-gray-800/50 rounded">
          {selectedAddress ? 'Active' : ''}
        </div>
      )}
    </div>
  );
}
