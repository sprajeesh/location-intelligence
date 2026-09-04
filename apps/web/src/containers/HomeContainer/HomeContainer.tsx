"use client";

import { useEffect, useState } from "react";
import { SearchContainer } from "@/containers/SearchContainer";
import { NavigateSearchContainer } from "@/containers/NavigateSearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { useLocationStore } from "@/store";
import PanelCollapseButton from "@/components/PanelCollapseButton/PanelCollapseButton";

export function HomeContainer() {
  const { isNavigating, selectedAddress, isPanelCollapsed, togglePanelCollapsed, setPanelCollapsed } =
    useLocationStore();
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect if we're on desktop (md breakpoint is 768px)
  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  // Expand panel when a new address is selected (don't collapse based on previous action)
  useEffect(() => {
    if (selectedAddress && isPanelCollapsed) {
      setPanelCollapsed(false);
    }
  }, [selectedAddress?.lat, selectedAddress?.lon, isPanelCollapsed, setPanelCollapsed]);

  // Once an address is selected, the search+results column stops floating
  // over the map and becomes a real, pinned part of the layout (sidebar on
  // desktop, top 60% block on mobile) with the map genuinely resizing into
  // the remaining space. isNavigating can only become true once an address
  // is already selected (see useNavigate.ts), so this one flag is enough to
  // gate both the results-panel and route-panel cases.
  const hasActivePanel = !!selectedAddress;

  // Calculate panel width based on collapsed state
  const getPanelWidth = () => {
    if (!hasActivePanel) return undefined;
    if (isPanelCollapsed) return undefined;
    if (!isDesktop) return undefined;
    return "md:w-[360px] lg:w-[400px] xl:w-[440px]";
  };

  const panelWidthClass = getPanelWidth();

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row">
      {/* Panel container — shows only when expanded; hidden when collapsed */}
      <div
        className={
          hasActivePanel && !isPanelCollapsed
            ? `relative z-10 flex-shrink-0 flex flex-col overflow-visible bg-white h-[60vh] w-full md:h-full md:overflow-hidden ${panelWidthClass} transition-all duration-300 ease-in-out border-r border-slate-200`
            : hasActivePanel && isPanelCollapsed
            ? "hidden"
            : "absolute inset-0 z-10 p-4 pointer-events-none overflow-hidden"
        }
      >
        {/* Collapse button — positioned at panel edge */}
        {hasActivePanel && (
          <PanelCollapseButton
            isCollapsed={isPanelCollapsed}
            onToggle={togglePanelCollapsed}
            isDesktop={isDesktop}
          />
        )}

        <div
          className={
            hasActivePanel
              ? `flex flex-col h-full overflow-hidden ${isPanelCollapsed && isDesktop ? "opacity-0 invisible" : "opacity-100 visible"} transition-opacity duration-300`
              : "flex flex-col h-full pointer-events-none max-w-md md:h-[75vh] md:gap-2 lg:h-full"
          }
        >
          {/* Search bar — always at the top */}
          <div
            className={
              hasActivePanel
                ? "flex-shrink-0 p-4 pb-2 border-slate-200 md:border-r"
                : "flex-shrink-0 relative z-20 pointer-events-auto"
            }
          >
            {isNavigating ? <NavigateSearchContainer /> : <SearchContainer />}
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
