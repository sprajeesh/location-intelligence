"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";
import { SearchContainer } from "@/containers/SearchContainer";
import { AnalysisContainer } from "@/containers/AnalysisContainer";
import { MapContainerDynamic } from "@/containers/MapContainer";
import { useLocationStore } from "@/store";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useAnalyzeCategories } from "@/hooks/useAnalyzeCategories";
import { useAnalyzeCategoryWeights } from "@/hooks/useAnalyzeCategoryWeights";
import { useReportAction } from "@/hooks/useReportAction";
import PanelCollapseButton from "@/components/PanelCollapseButton/PanelCollapseButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsContainer } from "@/containers/SettingsContainer";
import { MobileMenu } from "@/components/MobileMenu";
import { ResultsSheet } from "@/components/ResultsSheet";
import { SURFACE_PANEL_CLASSES } from "@/components/ui/SurfacePanel";

export function HomeContainer() {
  const {
    selectedAddress,
    analysisResult,
    isAnalyzing,
    radiusKm,
    distanceMode,
    isPanelCollapsed,
    togglePanelCollapsed,
    setPanelCollapsed,
    sheetSnap,
    setSheetSnap,
    setMapBottomInsetPx,
  } = useLocationStore(
    useShallow((s) => ({
      selectedAddress: s.selectedAddress,
      analysisResult: s.analysisResult,
      isAnalyzing: s.isAnalyzing,
      radiusKm: s.radiusKm,
      distanceMode: s.distanceMode,
      isPanelCollapsed: s.isPanelCollapsed,
      togglePanelCollapsed: s.togglePanelCollapsed,
      setPanelCollapsed: s.setPanelCollapsed,
      sheetSnap: s.sheetSnap,
      setSheetSnap: s.setSheetSnap,
      setMapBottomInsetPx: s.setMapBottomInsetPx,
    })),
  );
  const isDesktop = useIsDesktop();
  const t = useTranslations();
  const addressSearch = useAddressSearch();
  const categories = useAnalyzeCategories();
  const categoryWeights = useAnalyzeCategoryWeights();

  // Build report request from current analysis state (only valid when results exist)
  const reportRequest = useMemo(
    () =>
      selectedAddress && analysisResult && !isAnalyzing
        ? {
            address: selectedAddress.displayName,
            lat: selectedAddress.lat,
            lon: selectedAddress.lon,
            radiusKm,
            distanceMode,
            categories,
            categoryWeights,
          }
        : null,
    [
      selectedAddress,
      analysisResult,
      isAnalyzing,
      radiusKm,
      distanceMode,
      categories,
      categoryWeights,
    ],
  );

  const reportAction = useReportAction(reportRequest);
  const menuReport = selectedAddress ? reportAction : undefined;

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

  // On mobile, once an address is selected the map is always the full-bleed
  // backdrop and the search / results live in a floating top bar and a bottom
  // sheet. Desktop keeps the pinned sidebar. The sidebar is not rendered at
  // all on mobile so AnalysisContainer is only ever mounted once.
  const mobileActive = !isDesktop && hasActivePanel;

  // Leaving the mobile layout (resize / rotate to desktop) must not leave a
  // stale inset behind that would offset the desktop camera.
  useEffect(() => {
    if (!mobileActive) setMapBottomInsetPx(0);
  }, [mobileActive, setMapBottomInsetPx]);

  const overallScore = analysisResult?.score?.overall;
  const sheetSummary = selectedAddress && (
    <span className="flex items-center gap-2 min-w-0">
      {typeof overallScore === "number" && (
        <span className="font-bold text-primary-700 flex-shrink-0">{Math.round(overallScore)}</span>
      )}
      <span className="truncate text-slate-600">{selectedAddress.displayName}</span>
    </span>
  );

  return (
    <>
      {/* Fills the relative slot in page.tsx, which already stops above the footer. */}
      <div className="absolute inset-0 flex flex-col md:flex-row">
        {/* Panel container — shows only when expanded; hidden when collapsed.
          Not rendered on mobile once an address is selected (see mobileActive). */}
        {!mobileActive && (
        <div
          className={
            hasActivePanel && !isPanelCollapsed
              ? `relative z-10 flex-shrink-0 flex flex-col overflow-visible bg-white h-full w-full md:h-full ${panelWidthClass} transition-all duration-300 ease-in-out border-r border-slate-200`
              : hasActivePanel && isPanelCollapsed
                ? "hidden"
                : "absolute inset-0 z-10 p-4 pointer-events-none"
          }
        >
          <div
            className={
              hasActivePanel
                ? `flex flex-col h-full ${isPanelCollapsed && isDesktop ? "opacity-0 invisible" : "opacity-100 visible"} transition-opacity duration-300`
                : "flex flex-col h-full pointer-events-none max-w-md md:h-[75dvh] md:gap-2 lg:h-full"
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
                  : "relative flex-shrink-0 z-20 pointer-events-auto flex items-start gap-2"
              }
            >
              <div className="flex-1">
                <SearchContainer
                  query={addressSearch.query}
                  setQuery={addressSearch.setQuery}
                  suggestions={addressSearch.suggestions}
                  isLoading={addressSearch.isLoading}
                  error={addressSearch.error}
                  leading={<MobileMenu report={menuReport} />}
                />
              </div>
              {/* Theme / Score Config buttons — desktop only; on mobile these
                live in the "⋯" MobileMenu next to the search instead. Gated on
                isDesktop (not a CSS breakpoint) so SettingsContainer isn't
                double-mounted alongside its mobile counterpart below.
                Positioned outside the search row's own flow (left-full) so
                the address input keeps its original width instead of
                sharing the row with them. */}
              {isDesktop && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center gap-2 pointer-events-auto whitespace-nowrap">
                  <ThemeToggle className={SURFACE_PANEL_CLASSES.chip} />
                  <SettingsContainer
                    expanded
                    className={SURFACE_PANEL_CLASSES.chip}
                  />
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
                  : "min-h-0 overflow-hidden pointer-events-auto h-[50dvh] bottom-0 left-0 right-0 absolute sm:w-full md:relative md:h-auto md:flex-1 md:mt-0"
              }
            >
              <AnalysisContainer />
            </div>
          </div>
        </div>
        )}

        {/* Map container — full-bleed before a panel is active; on mobile in map view, shows full screen.
          On mobile the map is always visible; the sheet and top bar float over it. */}
        <div
          className="flex-1 min-w-0 min-h-0 relative z-0 md:flex"
        >
          <MapContainerDynamic />
        </div>
      </div>

      {/* Mobile: search + menu float over the map, and results sit in a bottom
          sheet. The wrapper ignores pointer events so the map stays draggable
          around the floating pieces. */}
      {mobileActive && (
        <>
          <div className="absolute top-0 left-0 right-0 z-20 md:hidden p-3 pt-safe pointer-events-none">
            <div className="pointer-events-auto flex items-start gap-2">
              <div className="flex-1">
                <SearchContainer
                  query={addressSearch.query}
                  setQuery={addressSearch.setQuery}
                  suggestions={addressSearch.suggestions}
                  isLoading={addressSearch.isLoading}
                  error={addressSearch.error}
                  leading={<MobileMenu report={menuReport} />}
                />
              </div>
            </div>
          </div>
          <ResultsSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            onHeightChange={setMapBottomInsetPx}
            summary={sheetSummary}
            label={t("sheet.label", { defaultValue: "Results" })}
          >
            <AnalysisContainer />
          </ResultsSheet>
        </>
      )}

      {/* Collapse button — positioned outside layout flow so it's always visible and clickable */}
      {hasActivePanel && !mobileActive && (
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
