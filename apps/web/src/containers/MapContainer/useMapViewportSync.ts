import { useCallback, useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import { useShallow } from "zustand/react/shallow";
import { useLocationStore } from "@/store/index";
import { computeMapBounds } from "@/utils/mapBounds";
import type { ParcelFeature } from "@/types/parcel";
import {
  ADDRESS_FLY_ZOOM,
  FIT_BOUNDS_PADDING,
  MIN_ROUTE_POINTS,
  PARCEL_FLY_PADDING,
  ROUTE_FIT_PADDING,
} from "./mapConstants";

export interface ParcelLookup {
  data: ParcelFeature | null | undefined;
  isFetching: boolean;
}

/**
 * Drives the map's camera in response to store changes: flying to a newly
 * selected address or parcel, panning to a highlighted facility, framing an
 * active route, and re-fitting when facility visibility changes.
 *
 * Each effect fires on a named trigger only, so unrelated updates (e.g. a
 * parcel arriving after the user has already zoomed) don't yank the view.
 */
export function useMapViewportSync(map: LeafletMap, parcelLookup: ParcelLookup) {
  const { selectedAddress, analysisResult, visibleFacilityIds, activeRoute, selectedFeature, isMapViewOnMobile } =
    useLocationStore(
      useShallow((s) => ({
        selectedAddress: s.selectedAddress,
        analysisResult: s.analysisResult,
        visibleFacilityIds: s.visibleFacilityIds,
        activeRoute: s.activeRoute,
        selectedFeature: s.selectedFeature,
        isMapViewOnMobile: s.isMapViewOnMobile,
      })),
    );
  const { data: parcelData, isFetching: parcelIsFetching } = parcelLookup;

  // Fly to the matched parcel once the lookup settles; fall back to the
  // address point if no parcel was found. Single decision per selection --
  // no interim flyTo to fight, so manual zoom is never overridden. Keyed off
  // the lookup directly (not the store's parcelFeature, which updates a render
  // later) so this fires exactly once per settle. The analysis fit-bounds
  // effect below still re-frames the map once facility results arrive.
  useEffect(() => {
    if (!selectedAddress || parcelIsFetching) return;
    if (parcelData) {
      const bounds = L.geoJSON(parcelData as unknown as GeoJSON.Feature).getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: PARCEL_FLY_PADDING });
        return;
      }
    }
    map.flyTo([selectedAddress.lat, selectedAddress.lon], ADDRESS_FLY_ZOOM);
  }, [selectedAddress, parcelData, parcelIsFetching, map]);

  // Pan to selected facility without changing zoom
  useEffect(() => {
    if (!selectedFeature) return;
    map.panTo([selectedFeature.lat, selectedFeature.lon]);
  }, [selectedFeature, map]);

  // Fit map to active route when it changes
  useEffect(() => {
    if (!activeRoute || activeRoute.length < MIN_ROUTE_POINTS) return;
    const bounds = L.latLngBounds(activeRoute);
    // Extend to include actual marker positions — OSRM snaps to roads so
    // route endpoints may not exactly match the marker coordinates.
    const { selectedAddress: addr, selectedFeature: feat } = useLocationStore.getState();
    if (addr) bounds.extend([addr.lat, addr.lon]);
    if (feat) bounds.extend([feat.lat, feat.lon]);
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: ROUTE_FIT_PADDING });
    }
  }, [activeRoute, map]);

  // Read the latest analysis from a ref so the fit callback below doesn't
  // need it as a dependency -- analysis results arriving shouldn't re-zoom.
  const analysisResultRef = useRef(analysisResult);
  useEffect(() => {
    analysisResultRef.current = analysisResult;
  }, [analysisResult]);

  // Fit bounds to everything currently shown on the map (parcel, visible
  // category markers, active route, and the address point). Reads parcel/route/
  // address fresh from the store at call time (not as deps) so this only
  // re-fires for the two named triggers below.
  const fitBoundsToMapContent = useCallback(() => {
    const visibleFeatures = (analysisResultRef.current?.features ?? []).filter((f) =>
      visibleFacilityIds.has(f.id),
    );
    const {
      selectedAddress: addr,
      parcelFeature: parcel,
      activeRoute: route,
    } = useLocationStore.getState();

    const bounds = computeMapBounds({
      selectedAddress: addr,
      parcelFeature: parcel,
      features: visibleFeatures,
      activeRoute: route,
    });
    if (bounds) map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING });
  }, [visibleFacilityIds, map]);

  // Fit when the user toggles facility visibility. Skips when nothing is
  // toggled on so hiding the last facility doesn't yank the view back to
  // the parcel/address.
  useEffect(() => {
    if (visibleFacilityIds.size === 0) return;
    fitBoundsToMapContent();
  }, [visibleFacilityIds, fitBoundsToMapContent]);

  // Fit everything when switching to full-screen map view on mobile — always
  // runs (even with 0 visible facilities) since this is a deliberate "show me
  // everything" action. Deferred so the fit happens after the mobile layout
  // swaps the panel out for the full-screen map (map size must update first).
  useEffect(() => {
    if (!isMapViewOnMobile) return;
    const timer = setTimeout(fitBoundsToMapContent, 0);
    return () => clearTimeout(timer);
  }, [isMapViewOnMobile, fitBoundsToMapContent]);
}
