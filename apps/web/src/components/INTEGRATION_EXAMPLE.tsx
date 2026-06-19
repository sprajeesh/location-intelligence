/**
 * INTEGRATION_EXAMPLE.tsx
 *
 * Example of how to integrate ResultsPanel into your page layout.
 * This shows the typical usage with MapView and SearchBar.
 *
 * Copy and adapt to your actual page component.
 */

'use client';

import React from 'react';
import ResultsPanel from './ResultsPanel';
import { MapContainer } from '@/containers/MapContainer';
import { SearchContainer } from '@/containers/SearchContainer';
import { useLocationStore } from '@/store/index';
import type { Feature } from '@/types/api';

/**
 * Example layout: Desktop (panel left + map right) / Mobile (stack)
 */
export default function LocationAnalysisPage() {
  const { radiusKm, setRadiusKm } = useLocationStore();

  // Handle facility click: center map and open popup
  const handleFacilityClick = (feature: Feature) => {
    // Map container handles centering when a feature is selected
  };

  // Handle increase radius: bump by 5km and re-analyze
  const handleIncreaseRadius = () => {
    const newRadius = radiusKm + 5;
    setRadiusKm(newRadius);
    
    // Store will trigger useAnalyze mutation via SearchContainer
    // which will fetch new results
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Left Panel - Desktop only, hidden on mobile */}
      <div className="hidden md:flex md:w-80 md:flex-col md:border-r md:border-slate-700/30 md:bg-slate-900/40">
        {/* Search bar in panel header */}
        <div className="flex-shrink-0 border-b border-slate-700/30 p-4">
          <SearchContainer />
        </div>

        {/* Results panel */}
        <div className="flex-1 overflow-hidden">
          <ResultsPanel
            onFacilityClick={handleFacilityClick}
            onIncreaseRadius={handleIncreaseRadius}
            className="h-full rounded-none"
          />
        </div>
      </div>

      {/* Right side - Map + Mobile bottom sheet */}
      <div className="flex-1 flex flex-col relative">
        {/* Map */}
        <MapContainer />

        {/* Mobile bottom sheet - Results panel slides up */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 max-h-[80vh]">
          <ResultsPanel
            onFacilityClick={handleFacilityClick}
            onIncreaseRadius={handleIncreaseRadius}
            className="rounded-t-2xl"
          />
        </div>

        {/* Mobile search bar - Top floating */}
        <div className="md:hidden absolute top-4 left-4 right-4 z-20">
          <SearchContainer />
        </div>
      </div>
    </div>
  );
}

/**
 * Alternative: Using Tailwind's flex layout for better responsiveness
 */
export function LocationAnalysisPageV2() {
  const { radiusKm, setRadiusKm } = useLocationStore();

  const handleFacilityClick = (feature: Feature) => {
    // Map container handles centering when a feature is selected
  };

  const handleIncreaseRadius = () => {
    setRadiusKm(radiusKm + 5);
  };

  return (
    <div className="flex h-screen flex-col md:flex-row bg-slate-950">
      {/* Left Panel */}
      <div className="hidden md:flex md:w-80 md:flex-col md:border-r md:border-slate-700/30">
        <div className="flex-shrink-0 border-b border-slate-700/30 p-4">
          <SearchContainer />
        </div>
        <div className="flex-1 overflow-hidden">
          <ResultsPanel
            onFacilityClick={handleFacilityClick}
            onIncreaseRadius={handleIncreaseRadius}
          />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 flex flex-col relative">
        <MapContainer />

        {/* Mobile overlay */}
        <div className="md:hidden absolute inset-0 pointer-events-none">
          {/* Search bar */}
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-auto">
            <SearchContainer />
          </div>

          {/* Results bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] pointer-events-auto">
            <ResultsPanel
              onFacilityClick={handleFacilityClick}
              onIncreaseRadius={handleIncreaseRadius}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tips for integration:
 *
 * 1. SearchBar should dispatch analysis via a container/hook
 *    that updates the Zustand store with results
 *
 * 2. MapView should read visibleCategories from store
 *    to show/hide markers dynamically
 *
 * 3. When facility is clicked, map centers and opens popup:
 *    const handleFacilityClick = (feature) => {
 *      mapRef.current?.setView([feature.lat, feature.lon], 15);
 *      // Optionally get marker from MapView and open its popup:
 *      // mapRef.current?.eachLayer(layer => {
 *      //   if (layer.feature?.properties?.id === feature.id) {
 *      //     layer.openPopup();
 *      //   }
 *      // });
 *    }
 *
 * 4. When "Increase Radius" is clicked:
 *    const handleIncreaseRadius = () => {
 *      const newRadius = radiusKm + 5;
 *      setRadiusKm(newRadius);
 *      // Trigger re-analysis automatically (via useAnalyze hook)
 *    }
 *
 * 5. Mobile considerations:
 *    - Use md: breakpoint (768px) to switch layouts
 *    - Bottom sheet can use drag gesture library (optional)
 *    - Ensure touch targets are 44x44px minimum
 *    - Test on actual devices
 */
