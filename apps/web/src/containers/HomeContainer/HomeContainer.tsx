"use client";

import { SearchContainer } from "@/containers/SearchContainer";
import { NavigateSearchContainer } from "@/containers/NavigateSearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { SettingsContainer } from "@/containers/SettingsContainer";
import { useLocationStore } from "@/store";

export function HomeContainer() {
  const { isNavigating, selectedAddress } = useLocationStore();

  // Once an address is selected, the search+results column stops floating
  // over the map and becomes a real, pinned part of the layout (sidebar on
  // desktop, top 60% block on mobile) with the map genuinely resizing into
  // the remaining space. isNavigating can only become true once an address
  // is already selected (see useNavigate.ts), so this one flag is enough to
  // gate both the results-panel and route-panel cases.
  const hasActivePanel = !!selectedAddress;

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row">
      <div
        className={
          hasActivePanel
            ? "relative z-10 flex-shrink-0 flex flex-col overflow-hidden bg-white h-[60vh] w-full md:h-full md:w-[360px] lg:w-[400px] xl:w-[440px]"
            : "absolute inset-0 z-10 p-4 pointer-events-none overflow-hidden"
        }
      >
        <div
          className={
            hasActivePanel
              ? "flex flex-col h-full"
              : "flex flex-col h-full pointer-events-none max-w-md md:h-[75vh] md:gap-2 lg:h-full"
          }
        >
          {/* Search bar — always at the top, with the Settings gear alongside it */}
          <div
            className={
              hasActivePanel
                ? "flex-shrink-0 flex items-start gap-2 p-4 pb-2 border-slate-200 md:border-r"
                : "flex-shrink-0 relative z-20 pointer-events-auto flex items-start gap-2"
            }
          >
            <div className="flex-1 min-w-0">
              {isNavigating ? <NavigateSearchContainer /> : <SearchContainer />}
            </div>
            <SettingsContainer />
          </div>

          {/* Spacer — pushes the floating panel to the bottom on mobile before
              a panel is active; once pinned, the panel slot below fills the
              remaining flex space directly, so no spacer is needed. */}
          {!hasActivePanel && <div className="flex-1 md:hidden" />}

          {/* Results / route panel */}
          <div
            className={
              hasActivePanel
                ? "flex-1 min-h-0 overflow-hidden"
                : "min-h-0 overflow-hidden pointer-events-auto h-[50vh] bottom-0 left-0 right-0 absolute sm:w-full md:relative md:h-auto md:flex-1 md:mt-0"
            }
          >
            <AnalysisContainer />
          </div>
        </div>
      </div>

      {/* Map — full-bleed before a panel is active (the panel above overlays
          it); shrinks into the remaining flex space once pinned. min-w-0/
          min-h-0 let it actually shrink below its intrinsic size instead of
          overflowing the flex row/column. */}
      <div className="flex-1 min-w-0 min-h-0 relative z-0">
        <MapContainerDynamic />
      </div>
    </div>
  );
}
