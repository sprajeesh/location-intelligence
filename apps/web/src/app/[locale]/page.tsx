"use client";

import { SearchContainer } from "@/containers/SearchContainer";
import { NavigateSearchContainer } from "@/containers/NavigateSearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { RadiusSelectorContainer } from "@/containers/RadiusSelectorContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { useLocationStore } from "@/store";

export default function HomePage() {
  const { isNavigating } = useLocationStore();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map fills the entire viewport */}
      <div className="absolute inset-0 z-0">
        <MapContainerDynamic />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 p-4 flex items-start gap-3 pointer-events-none overflow-hidden">
        {/* Left column: search bar stacked above the results / route panel */}
        <div className="flex flex-col gap-2 flex-1 max-w-md h-full min-h-0">
          {/* Search bar — swaps between single-field and two-field navigate bar */}
          <div className="pointer-events-auto flex-shrink-0">
            {isNavigating ? <NavigateSearchContainer /> : <SearchContainer />}
          </div>

          {/* Results / route panel — fills remaining height */}
          <div className="pointer-events-auto flex-1 min-h-0 overflow-hidden">
            <AnalysisContainer />
          </div>
        </div>

        {/* Right-side controls — hidden during navigation */}
        {!isNavigating && (
          <div className="flex items-start gap-3 flex-shrink-0 pointer-events-auto">
            <RadiusSelectorContainer />
          </div>
        )}
      </div>
    </div>
  );
}
