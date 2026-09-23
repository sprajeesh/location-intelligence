"use client";

import { useEffect } from "react";
import { SearchContainer } from "@/containers/SearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { useLocationStore } from "@/store";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import PanelCollapseButton from "@/components/PanelCollapseButton/PanelCollapseButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsContainer } from "@/containers/SettingsContainer";
import { MobileViewToggleContainer } from "@/containers/MobileViewToggleContainer";
import { SURFACE_PANEL_CLASSES } from "@/components/ui/SurfacePanel";

export function HomeContainer() {
  const { selectedAddress, isPanelCollapsed, togglePanelCollapsed, setPanelCollapsed, isMapViewOnMobile } =
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
    {/* bottom-14 reserves room for the fixed mobile controls bar below;
        md:bottom-0 removes that reservation on desktop, where the bar
        doesn't exist. */}
    <div className="absolute inset-0 bottom-14 md:bottom-0 flex flex-col md:flex-row">
      {/* Panel container — shows only when expanded; hidden when collapsed */}
      <div
        className={
          hasActivePanel && !isPanelCollapsed && !showMapOnMobile
            ? `relative z-10 flex-shrink-0 flex flex-col overflow-visible bg-white h-full w-full md:h-full ${panelWidthClass} transition-all duration-300 ease-in-out border-r border-slate-200`
            : hasActivePanel && !showMapOnMobile && isPanelCollapsed
            ? "hidden"
            : showMapOnMobile
            ? "hidden md:flex"
            : "absolute inset-0 z-10 p-4 pointer-events-none"
        }
      >

        <div
          className={
            hasActivePanel
              ? `flex flex-col h-full ${isPanelCollapsed && isDesktop ? "opacity-0 invisible" : "opacity-100 visible"} transition-opacity duration-300`
              : "flex flex-col h-full pointer-events-none max-w-md md:h-[75vh] md:gap-2 lg:h-full"
          }
        >
          {/* Search bar — always at the top. `relative` makes it the
              positioning anchor for the desktop Scoring/Theme buttons below,
              which sit just past its right edge (left-full) so the search
              input's own width is never squeezed to make room for them. */}
          <div
            className={
              hasActivePanel
                ? "relative flex-shrink-0 p-4 pb-2 border-b border-slate-200 md:border-r md:border-b-0 flex items-center gap-2"
                : "relative flex-shrink-0 z-20 pointer-events-auto"
            }
          >
            <div className="flex-1">
              <SearchContainer
                query={addressSearch.query}
                setQuery={addressSearch.setQuery}
                suggestions={addressSearch.suggestions}
                isLoading={addressSearch.isLoading}
                error={addressSearch.error}
              />
            </div>
            {/* Score Config + Theme buttons — desktop only; on mobile these
                live in the fixed bottom controls bar instead. Gated on
                isDesktop (not a CSS breakpoint) so SettingsContainer isn't
                double-mounted alongside its mobile counterpart below.
                Positioned outside the search row's own flow (left-full) so
                the address input keeps its original width instead of
                sharing the row with them. */}
            {isDesktop && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center gap-2 pointer-events-auto whitespace-nowrap">
                <SettingsContainer expanded className={SURFACE_PANEL_CLASSES.chip} />
                <ThemeToggle className={SURFACE_PANEL_CLASSES.chip} />
              </div>
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

      {/* Map container — full-bleed before a panel is active; on mobile in map view, shows full screen.
          On mobile when showing map, use z-20 to ensure toolbar sits above the results panel's z-10. */}
      <div className={`flex-1 min-w-0 min-h-0 relative ${showResultsOnMobile ? "hidden z-0" : showMapOnMobile ? "z-20 md:z-0" : "z-0"} md:flex`}>
        <MapContainerDynamic />
      </div>
    </div>

    {/* Search bar for mobile map view — floats above map */}
    {showMapOnMobile && (
      <div className="absolute top-0 left-0 right-0 z-20 md:hidden p-4 pb-2 bg-white border-b border-slate-200 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchContainer
              query={addressSearch.query}
              setQuery={addressSearch.setQuery}
              suggestions={addressSearch.suggestions}
              isLoading={addressSearch.isLoading}
              error={addressSearch.error}
            />
          </div>
        </div>
      </div>
    )}

    {/* Mobile controls bar — fixed to the bottom of the screen across every
        mobile state (initial view, results, map). Replaces the old inline
        "Show map" / floating "View scores"/"Show route" buttons with a
        single Map/Results toggle, alongside Scoring and Theme. No shared
        panel background (matches the desktop treatment) — each button
        carries its own white/bordered card so it still reads as tappable
        over the map or results content behind it. */}
    {!isDesktop && (
      <div className="fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-center gap-2 p-3">
        <MobileViewToggleContainer className={SURFACE_PANEL_CLASSES.chip} />
        <SettingsContainer className={SURFACE_PANEL_CLASSES.chip} />
        <ThemeToggle compact className={SURFACE_PANEL_CLASSES.chip} />
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
