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
      <div className="absolute inset-0 z-10 p-4 pointer-events-none overflow-hidden">
        {/* Mobile: full-height flex column — toolbar at top, results at bottom, map visible in between */}
        {/* Desktop: flex column capped at 75vh */}
        <div className="flex flex-col h-full pointer-events-auto
                        max-w-md
                        md:h-[75vh] md:gap-2">
          {/* Search bar + radius selector — always at the top */}
          <div className="flex-shrink-0 relative z-20">
            {isNavigating ? <NavigateSearchContainer /> : <SearchContainer />}
            {!isNavigating && (
              <div className="mt-2">
                <RadiusSelectorContainer />
              </div>
            )}
          </div>

          {/* Spacer — pushes results panel to the bottom on mobile, hidden on desktop */}
          <div className="flex-1 md:hidden" />

          {/* Results / route panel
              mobile: fixed 50vh at the bottom
              desktop: fills remaining height */}
          <div className="min-h-0 overflow-hidden
                          h-[50vh] bottom-0 left-0 right-0 absolute sm:w-full
                          md:relative md:h-auto md:flex-1 md:mt-0">
            <AnalysisContainer />
          </div>
        </div>
      </div>
    </div>
  );
}
