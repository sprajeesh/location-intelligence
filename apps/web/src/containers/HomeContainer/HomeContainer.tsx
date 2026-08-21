"use client";

import { SearchContainer } from "@/containers/SearchContainer";
import { NavigateSearchContainer } from "@/containers/NavigateSearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { SettingsContainer } from "@/containers/SettingsContainer";
import { useLocationStore } from "@/store";

export function HomeContainer() {
  const { isNavigating } = useLocationStore();

  return (
    <>
      {/* Map fills the entire viewport */}
      <div className="absolute inset-0 z-0">
        <MapContainerDynamic />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 p-4 pointer-events-none overflow-hidden">
        {/* Mobile: full-height flex column — toolbar at top, results at bottom, map visible in between */}
        {/* Tablet: flex column capped at 75vh */}
        {/* Large screens (lg+): no cap — column fills the full overlay height so the results panel can use all available room */}
        <div className="flex flex-col h-full pointer-events-none
                        max-w-md
                        md:h-[75vh] md:gap-2
                        lg:h-full">
          {/* Search bar — always at the top, with the Settings gear alongside it */}
          <div className="flex-shrink-0 relative z-20 pointer-events-auto flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {isNavigating ? <NavigateSearchContainer /> : <SearchContainer />}
            </div>
            <SettingsContainer />
          </div>

          {/* Spacer — pushes results panel to the bottom on mobile, hidden on desktop */}
          <div className="flex-1 md:hidden" />

          {/* Results / route panel
              mobile: fixed 50vh at the bottom
              desktop: fills remaining height */}
          <div className="min-h-0 overflow-hidden pointer-events-auto
                          h-[50vh] bottom-0 left-0 right-0 absolute sm:w-full
                          md:relative md:h-auto md:flex-1 md:mt-0">
            <AnalysisContainer />
          </div>
        </div>
      </div>
    </>
  );
}
