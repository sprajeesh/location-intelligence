"use client";

import { useEffect, useState, useId } from "react";
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  ScaleControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useLocationStore } from "@/store/index";
import { useParcelAtPoint } from "@/hooks/useParcelAtPoint";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useInvalidateSizeOnResize } from "@/hooks/useInvalidateSizeOnResize";
import { useTranslations } from "next-intl";
import {
  MapToolbarContainer,
  TILE_LAYER_URLS,
  TILE_LAYER_ATTRIBUTIONS,
  TILE_LAYER_MAX_ZOOM,
  type MapLayerId,
} from "@/containers/MapToolbarContainer";
import { MapNotice } from "@/components/MapNotice";
import { MapLoadingOverlay } from "@/components/MapLoadingOverlay";
import { ParcelInfoCard } from "@/components/ParcelInfoCard";
import { Spinner } from "@/components/ui/Spinner";
import { CorrectionPlacementHint } from "@/components/CorrectionPlacementHint";
import { MapCorrectionContainer } from "@/containers/MapCorrectionContainer";
import { useCorrectionPlacement } from "@/hooks/useCorrectionPlacement";
import { isMapCorrectionsEnabled } from "@/utils/mapCorrectionsFlag";
import { parcelCardPosition, type CardPosition } from "@/utils/mapCardPosition";
import { computeParcelStatus } from "@/utils/parcelStatus";
import { useMapViewportSync } from "./useMapViewportSync";
import { useFacilityIcons } from "./useFacilityIcons";
import {
  AddressMarker,
  ActiveRouteLayer,
  FacilityMarker,
  SelectedFeatureMarker,
} from "./MapLayers";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MIN_ROUTE_POINTS,
} from "./mapConstants";

/**
 * Leaflet's default marker icon URLs break under Next.js bundling, so point
 * them at the bundled assets. Runs once, on module load.
 */
function fixLeafletIcons() {
  const iconRetinaUrl = require("leaflet/dist/images/marker-icon-2x.png").default;
  const iconUrl = require("leaflet/dist/images/marker-icon.png").default;
  const shadowUrl = require("leaflet/dist/images/marker-shadow.png").default;

  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
}

fixLeafletIcons();

/**
 * Inner component that uses the map instance via useMap hook.
 * Wires store state to the map layers and the toolbar.
 */
function MapContent() {
  const map = useMap();
  const {
    selectedAddress,
    analysisResult,
    visibleFacilityIds,
    activeRoute,
    selectedFeature,
    routeMode,
    isNavigating,
    parcelFeature,
    theme,
    setIsMapViewOnMobile,
  } = useLocationStore(
    useShallow((s) => ({
      selectedAddress: s.selectedAddress,
      analysisResult: s.analysisResult,
      visibleFacilityIds: s.visibleFacilityIds,
      activeRoute: s.activeRoute,
      selectedFeature: s.selectedFeature,
      routeMode: s.routeMode,
      isNavigating: s.isNavigating,
      parcelFeature: s.parcelFeature,
      theme: s.theme,
      setIsMapViewOnMobile: s.setIsMapViewOnMobile,
    })),
  );

  const isDesktop = useIsDesktop();
  const t = useTranslations();
  const { getFacilityIcon, getSelectedFacilityIcon } = useFacilityIcons();
  const parcelQuery = useParcelAtPoint(selectedAddress);
  const parcelStatus = computeParcelStatus({
    hasAddress: !!selectedAddress,
    isFetching: parcelQuery.isFetching,
    isError: parcelQuery.isError,
    data: parcelQuery.data,
  });

  const [activeLayer, setActiveLayer] = useState<MapLayerId>("default");
  const [showParcelInfo, setShowParcelInfo] = useState(false);
  const [cardPosition, setCardPosition] = useState<CardPosition | null>(null);

  // Reset card visibility and position when search changes so new address doesn't inherit prior state
  useEffect(() => {
    setShowParcelInfo(false);
    setCardPosition(null);
  }, [selectedAddress]);

  // Facility marker popups stay open (Leaflet manages that internally, not
  // React) even after navigation ends, since the underlying marker never
  // unmounts. Close any open popup once navigation exits so the tooltip
  // overlay doesn't linger after the route is cleared.
  useEffect(() => {
    if (!isNavigating) {
      map.closePopup();
    }
  }, [isNavigating, map]);

  useInvalidateSizeOnResize(map);

  const correctionPlacement = useCorrectionPlacement();

  useMapViewportSync(map, {
    data: parcelQuery.data,
    isFetching: parcelQuery.isFetching,
  });

  const openParcelCard = (latlng: L.LatLng) => {
    const point = map.latLngToContainerPoint(latlng);
    const { width, height } = map.getContainer().getBoundingClientRect();
    setCardPosition(parcelCardPosition(point, { width, height }));
    setShowParcelInfo(true);
  };

  // Dark mode re-colors the 'default' (OSM) tiles with a CSS filter instead
  // of swapping to a separate dark tile provider (e.g. CARTO's dark_all) --
  // that keeps every OSM label/POI/road on screen (a dedicated dark basemap
  // ships far fewer features) and needs no second tile source to maintain.
  // Satellite/topo imagery isn't re-styleable this way, so it's left as-is.
  const isDarkDefault = theme === "dark" && activeLayer === "default";
  const tileUrl = TILE_LAYER_URLS[activeLayer];
  const tileAttribution = TILE_LAYER_ATTRIBUTIONS[activeLayer];
  const tileMaxZoom = TILE_LAYER_MAX_ZOOM[activeLayer];

  // On mobile, picking a route from a facility popup returns to the results
  // panel; on desktop the panel is always visible, so there's nothing to go back to.
  const onBackToResults = isDesktop ? undefined : () => setIsMapViewOnMobile(false);

  return (
    <>
      {/* Tile layer for the selected map provider. `className` is a
          creation-only Leaflet option (not reactively updated), so the key
          forces a remount when dark mode needs to toggle the CSS invert
          filter on/off for the 'default' layer. */}
      <TileLayer
        key={`${activeLayer}-${isDarkDefault}`}
        attribution={tileAttribution}
        url={tileUrl}
        maxZoom={tileMaxZoom}
        className={isDarkDefault ? "map-tiles-inverted" : undefined}
      />

      {parcelStatus === "notFound" && (
        <MapNotice
          tone="warning"
          icon={<TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
        >
          {t("parcels.notFoundBanner", {
            defaultValue: "Couldn't find a matching parcel boundary for this address.",
          })}
        </MapNotice>
      )}

      {parcelStatus === "error" && (
        <MapNotice
          tone="error"
          icon={<TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
        >
          {t("parcels.serviceError", {
            defaultValue:
              "Couldn't retrieve parcel information. Please check your connection and try again.",
          })}
        </MapNotice>
      )}

      {parcelStatus === "locating" && (
        <MapNotice tone="neutral" icon={<Spinner size="xs" decorative />}>
          {t("parcels.locating", { defaultValue: "Locating parcel…" })}
        </MapNotice>
      )}

      {correctionPlacement.placing && (
        <CorrectionPlacementHint
          onUseMapCentre={correctionPlacement.useMapCentre}
          onCancel={correctionPlacement.cancel}
        />
      )}

      {parcelFeature && showParcelInfo && (
        <ParcelInfoCard
          feature={parcelFeature}
          position={cardPosition}
          onClose={() => setShowParcelInfo(false)}
        />
      )}

      {/* Map toolbar (zoom/layers/locate) -- app-level controls (Scoring,
          Theme) live in HomeContainer now, not here. */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2">
        <MapToolbarContainer activeLayer={activeLayer} onLayerChange={setActiveLayer} />
      </div>

      <ScaleControl position="bottomleft" imperial={false} metric={true} />

      {/* Address point: a pin until a parcel matches, then the house icon. */}
      {selectedAddress && (
        <AddressMarker
          address={selectedAddress}
          matched={!!parcelFeature}
          onHouseClick={openParcelCard}
        />
      )}

      {analysisResult?.features.map((feature) => {
        if (!visibleFacilityIds.has(feature.id)) return null;
        return (
          <FacilityMarker
            key={feature.id}
            feature={feature}
            icon={getFacilityIcon(feature.category)}
            onBackToResults={onBackToResults}
          />
        );
      })}

      {activeRoute && activeRoute.length >= MIN_ROUTE_POINTS && (
        <ActiveRouteLayer positions={activeRoute} mode={routeMode} />
      )}

      {selectedFeature && (
        <SelectedFeatureMarker
          feature={selectedFeature}
          icon={getSelectedFacilityIcon(selectedFeature.category)}
        />
      )}
    </>
  );
}

/**
 * Main MapContainer component. Owns the Leaflet map instance and the loading
 * overlay; everything inside the map reads from the store via MapContent.
 */
export function MapContainer() {
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const isAnalyzing = useLocationStore((s) => s.isAnalyzing);
  const mapId = useId();

  const initialCenter: [number, number] = selectedAddress
    ? [selectedAddress.lat, selectedAddress.lon]
    : DEFAULT_MAP_CENTER;

  return (
    <div className="relative w-full h-full" id={`map-wrapper-${mapId}`}>
      <LeafletMapContainer
        key={mapId}
        center={initialCenter}
        zoom={DEFAULT_MAP_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <MapContent />
      </LeafletMapContainer>

      {isAnalyzing && <MapLoadingOverlay />}

      {isMapCorrectionsEnabled() && <MapCorrectionContainer />}
    </div>
  );
}

export default MapContainer;
