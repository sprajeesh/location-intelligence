"use client";

import { useEffect } from "react";
import { SearchContainer } from "@/containers/SearchContainer";
import { NavigateSearchContainer } from "@/containers/NavigateSearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { useLocationStore } from "@/store";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import PanelCollapseButton from "@/components/PanelCollapseButton/PanelCollapseButton";
import { Map, BarChart3 } from "lucide-react";

export function HomeContainer() {
  const { isNavigating, selectedAddress, isPanelCollapsed, togglePanelCollapsed, setPanelCollapsed, isMapViewOnMobile, setIsMapViewOnMobile } =
    useLocationStore();
  const isDesktop = useIsDesktop();
  const addressSearch = useAddressSearch();

  // Expand panel when a new address is selected (don't collapse based on previous action)
  useEffect(() => {
    if (selectedAddress && isPanelCollapsed) {
      setPanelCollapsed(false);
    }
  }, [selectedAddress?.lat, selectedAddress?.lon, setPanelCollapsed]);

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

  const showMapOnMobile = isMapViewOnMobile && !isDesktop && hasActivePanel;
  const showResultsOnMobile = !isMapViewOnMobile && !isDesktop && hasActivePanel;

  return (
    <>
    <div className="absolute inset-0 flex flex-col md:flex-row">
      {/* Panel container — shows only when expanded; hidden when collapsed */}
      <div
        className={
          hasActivePanel && !isPanelCollapsed && !showMapOnMobile
            ? `relative z-10 flex-shrink-0 flex flex-col overflow-visible bg-white h-full w-full md:h-full md:overflow-hidden ${panelWidthClass} transition-all duration-300 ease-in-out border-r border-slate-200`
            : hasActivePanel && !showMapOnMobile && isPanelCollapsed
            ? "hidden"
            : showMapOnMobile
            ? "hidden md:flex"
            : "absolute inset-0 z-10 p-4 pointer-events-none overflow-hidden"
        }
      >

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
                ? "flex-shrink-0 p-4 pb-2 border-b border-slate-200 md:border-r md:border-b-0 flex items-center gap-2"
                : "flex-shrink-0 relative z-20 pointer-events-auto"
            }
          >
            <div className="flex-1">
              {isNavigating ? (
                <NavigateSearchContainer />
              ) : (
                <SearchContainer
                  query={addressSearch.query}
                  setQuery={addressSearch.setQuery}
                  suggestions={addressSearch.suggestions}
                  isLoading={addressSearch.isLoading}
                  error={addressSearch.error}
                />
              )}
            </div>
            {/* Show Map button on mobile results view */}
            {hasActivePanel && !isDesktop && !isMapViewOnMobile && (
              <button
                onClick={() => setIsMapViewOnMobile(true)}
                className="flex-shrink-0 md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Show map"
                aria-label="Show map"
              >
                <Map className="w-5 h-5 text-slate-600" />
              </button>
            )}
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

      {/* Map container — full-bleed before a panel is active; on mobile in map view, shows full screen */}
      <div className={`flex-1 min-w-0 min-h-0 relative z-0 ${showResultsOnMobile ? "hidden" : ""} md:flex`}>
        <MapContainerDynamic />
      </div>
    </div>

    {/* Search bar for mobile map view — floats above map */}
    {showMapOnMobile && (
      <div className="absolute top-0 left-0 right-0 z-20 md:hidden p-4 pb-2 bg-white border-b border-slate-200 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {isNavigating ? (
              <NavigateSearchContainer />
            ) : (
              <SearchContainer
                query={addressSearch.query}
                setQuery={addressSearch.setQuery}
                suggestions={addressSearch.suggestions}
                isLoading={addressSearch.isLoading}
                error={addressSearch.error}
              />
            )}
          </div>
          {/* View Score button on mobile map view */}
          <button
            onClick={() => setIsMapViewOnMobile(false)}
            className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="View scores"
            aria-label="View scores"
          >
            <BarChart3 className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    )}

    {/* Collapse button — positioned outside layout flow so it's always visible and clickable */}
    {hasActivePanel && !showMapOnMobile && (
      <div className="pointer-events-none fixed inset-0 z-0">
        <PanelCollapseButton
          isCollapsed={isPanelCollapsed}
          onToggle={togglePanelCollapsed}
        />
      </div>
    )}
    </>
  );
}
