"use client";

import {
  useEffect,
  useRef,
  useMemo,
  useId,
  useState,
  useCallback,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  GeoJSON,
  ScaleControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TriangleAlert, MapPin } from "lucide-react";
import { useLocationStore } from "@/store/index";
import { useCategories } from "@/hooks/useCategories";
import { useParcelAtPoint } from "@/hooks/useParcelAtPoint";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { computeMapBounds } from "@/utils/mapBounds";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useCategoryColorMap } from "@/hooks/useCategoryColorMap";
import { useTranslations } from "next-intl";
import {
  MapToolbarContainer,
  TILE_LAYER_URLS,
  TILE_LAYER_ATTRIBUTIONS,
  TILE_LAYER_MAX_ZOOM,
  type MapLayerId,
} from "@/containers/MapToolbarContainer";
import { FeatureInfoCard } from "@/components/FeatureInfoCard";
import { FacilityRouteModePicker } from "@/components/FacilityRouteModePicker";
import type { FeatureDetails } from "@/types/api";
import { isValidHttpUrl } from "@/utils/url";

// Ordered, curated subset of FeatureDetails to show as text rows in the
// facility popup. `wikidataId` is omitted -- it's a linking key, not
// user-facing text. `image` is also omitted here -- it renders as a
// thumbnail below these rows instead of a label/value line.
const FACILITY_DETAIL_FIELDS: Array<{ key: keyof FeatureDetails; i18nKey: string }> = [
  { key: "description", i18nKey: "map.markerPopup.details.description" },
  { key: "openingHours", i18nKey: "map.markerPopup.details.openingHours" },
  { key: "phone", i18nKey: "map.markerPopup.details.phone" },
  { key: "email", i18nKey: "map.markerPopup.details.email" },
  { key: "website", i18nKey: "map.markerPopup.details.website" },
  { key: "operator", i18nKey: "map.markerPopup.details.operator" },
  { key: "cuisine", i18nKey: "map.markerPopup.details.cuisine" },
  { key: "emergency", i18nKey: "map.markerPopup.details.emergency" },
  { key: "healthcareSpeciality", i18nKey: "map.markerPopup.details.healthcareSpeciality" },
  { key: "wheelchair", i18nKey: "map.markerPopup.details.wheelchair" },
];

/**
 * Fix Leaflet icon issue in Next.js (dynamic imports break default icon URLs)
 * Called once on module load, not on every component mount
 */
let leafletIconsFixed = false;
const fixLeafletIcons = () => {
  if (leafletIconsFixed) return;

  const iconRetinaUrl =
    require("leaflet/dist/images/marker-icon-2x.png").default;
  const iconUrl = require("leaflet/dist/images/marker-icon.png").default;
  const shadowUrl = require("leaflet/dist/images/marker-shadow.png").default;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });

  leafletIconsFixed = true;
};

// Fix icons on module load
fixLeafletIcons();

/**
 * Inner component that uses the map instance via useMap hook.
 * Handles fitting bounds to features when data changes.
 * Renders the map toolbar container.
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
    isMapViewOnMobile,
    setIsMapViewOnMobile,
  } = useLocationStore();

  const isDesktop = useIsDesktop();
  const t = useTranslations();
  const { categories } = useCategories();
  const parcelQuery = useParcelAtPoint(selectedAddress);
  const parcelNotFound =
    !!selectedAddress && !parcelQuery.isFetching && parcelQuery.data === null;
  const parcelServiceError =
    !!selectedAddress && !parcelQuery.isFetching && parcelQuery.isError;

  const [activeLayer, setActiveLayer] = useState<MapLayerId>("default");
  const [showParcelInfo, setShowParcelInfo] = useState(false);
  const [cardPosition, setCardPosition] = useState<{
    top?: number;
    left?: number;
  } | null>(null);

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

  // Leaflet 1.9's trackResize only reacts to the browser window's own
  // 'resize' event -- it has no built-in ResizeObserver on the map
  // container itself. Now that the container's box changes size purely via
  // our own CSS layout (pinning the results sidebar, crossing the mobile/
  // desktop breakpoint), Leaflet would never notice on its own and would
  // keep rendering its stale tile grid, so this is required.
  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [map]);

  // Dark mode re-colors the 'default' (OSM) tiles with a CSS filter instead
  // of swapping to a separate dark tile provider (e.g. CARTO's dark_all) --
  // that keeps every OSM label/POI/road on screen (a dedicated dark basemap
  // ships far fewer features) and needs no second tile source to maintain.
  // Satellite/topo imagery isn't re-styleable this way, so it's left as-is.
  const isDarkDefault = theme === "dark" && activeLayer === "default";
  const tileUrl = TILE_LAYER_URLS[activeLayer];
  const tileAttribution = TILE_LAYER_ATTRIBUTIONS[activeLayer];
  const tileMaxZoom = TILE_LAYER_MAX_ZOOM[activeLayer];

  // Parcel highlight pane -- below Leaflet's own markerPane (600), so
  // category/main markers stay on top and clickable. Interaction (click to
  // show popup) is enabled since the parcel layer itself doesn't block
  // markers (those sit in a higher pane).
  useEffect(() => {
    if (!map.getPane("parcelPane")) {
      const pane = map.createPane("parcelPane");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "auto";
    }
  }, [map]);

  // Map category id -> DB-configured color, from GET /categories
  const categoryColorMap = useCategoryColorMap();

  // Pre-render Lucide icons to SVG strings for use in L.divIcon markers
  const defaultMarkerIconMarkup = useMemo(
    () =>
      renderToStaticMarkup(
        <MapPin color="white" size={14} strokeWidth={2.5} />,
      ),
    [],
  );

  const categoryIconMarkupMap = useMemo(() => {
    const markup: Record<string, string> = {};
    for (const category of categories) {
      const Icon = getCategoryIcon(category.id);
      markup[category.id] = renderToStaticMarkup(
        <Icon color="white" size={14} strokeWidth={2.5} />,
      );
    }
    return markup;
  }, [categories]);

  // Fly to the matched parcel once the lookup settles; fall back to the
  // address point if no parcel was found. Single decision per selection --
  // no interim flyTo to fight, so manual zoom is never overridden. Keyed
  // off parcelQuery directly (not the store's parcelFeature, which updates
  // a render later) so this fires exactly once per settle. The analysis
  // fit-bounds effect further down still re-frames the map once facility
  // results arrive, same as before.
  useEffect(() => {
    if (!selectedAddress || parcelQuery.isFetching) return;
    if (parcelQuery.data) {
      const bounds = L.geoJSON(
        parcelQuery.data as unknown as GeoJSON.Feature,
      ).getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40] });
        return;
      }
    }
    map.flyTo([selectedAddress.lat, selectedAddress.lon], 14);
  }, [selectedAddress, parcelQuery.data, parcelQuery.isFetching, map]);

  // Pan to selected facility without changing zoom
  useEffect(() => {
    if (!selectedFeature) return;
    map.panTo([selectedFeature.lat, selectedFeature.lon]);
  }, [selectedFeature, map]);

  // Fit map to active route when it changes
  useEffect(() => {
    if (!activeRoute || activeRoute.length < 2) return;
    const bounds = L.latLngBounds(activeRoute);
    // Extend to include actual marker positions — OSRM snaps to roads so
    // route endpoints may not exactly match the marker coordinates.
    const { selectedAddress: addr, selectedFeature: feat } =
      useLocationStore.getState();
    if (addr) bounds.extend([addr.lat, addr.lon]);
    if (feat) bounds.extend([feat.lat, feat.lon]);
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [60, 60] });
    }
  }, [activeRoute, map]);

  // Fit map bounds to visible markers when the user toggles facility visibility.
  // Depends only on visibleFacilityIds, not on analysisResult, so analysis results
  // arriving don't trigger unwanted re-zoom. Uses a ref to access current feature data
  // without re-firing the effect when analysis changes.
  const analysisResultRef = useRef(analysisResult);
  useEffect(() => {
    analysisResultRef.current = analysisResult;
  }, [analysisResult]);

  // Fit bounds to everything currently shown on the map (parcel, visible
  // category markers, active route, and the address point). Reads
  // parcel/route/address fresh from the store at call time (not as deps) so
  // this only re-fires for the two named triggers below, not on every
  // parcel/route change (those already have their own dedicated fly-to
  // effects above).
  const fitBoundsToMapContent = useCallback(() => {
    const visibleFeatures = (analysisResultRef.current?.features ?? []).filter(
      (f) => visibleFacilityIds.has(f.id),
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
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [visibleFacilityIds, map]);

  // Fit when the user toggles facility visibility. Skips when nothing is
  // toggled on so hiding the last facility doesn't yank the view back to
  // the parcel/address.
  useEffect(() => {
    if (visibleFacilityIds.size === 0) return;
    fitBoundsToMapContent();
  }, [visibleFacilityIds, fitBoundsToMapContent]);

  // Fit everything when switching to full-screen map view on mobile — always
  // runs (even with 0 visible facilities) since this is a deliberate
  // "show me everything" action, not an automatic re-frame while browsing.
  // Slight delay so the fit happens after the mobile layout swaps the panel
  // out for the full-screen map (map size must update first).
  useEffect(() => {
    if (!isMapViewOnMobile) return;
    const timer = setTimeout(fitBoundsToMapContent, 0);
    return () => clearTimeout(timer);
  }, [isMapViewOnMobile, fitBoundsToMapContent]);

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

      {/* Parcel highlight -- the cadastral parcel matched to the selected
          address, replacing the plain pin marker once resolved (see the
          Marker below). Bold outline, light fill so the basemap stays
          legible underneath. */}
      {parcelFeature && (
        <GeoJSON
          key={`${selectedAddress?.lat}-${selectedAddress?.lon}`}
          data={parcelFeature as unknown as GeoJSON.Feature}
          pane="parcelPane"
          style={{
            color: "rgb(var(--color-error-500))",
            weight: 3,
            fillColor: "rgb(var(--color-error-500))",
            fillOpacity: 0.15,
          }}
          onEachFeature={(_, layer) => {
            layer.on("click", (e) => {
              const point = map.latLngToContainerPoint(e.latlng);
              const container = map.getContainer();
              const containerRect = container.getBoundingClientRect();

              const CARD_WIDTH = 320;
              const CARD_HEIGHT = 160;
              const MIN_MARGIN = 10;
              const OFFSET = 50;

              const idealTop = point.y - OFFSET;
              const idealLeft = point.x - OFFSET;

              const clampedTop = Math.max(
                MIN_MARGIN,
                Math.min(idealTop, containerRect.height - CARD_HEIGHT - MIN_MARGIN)
              );

              const clampedLeft = Math.max(
                MIN_MARGIN,
                Math.min(idealLeft, containerRect.width - CARD_WIDTH - MIN_MARGIN)
              );

              setCardPosition({
                top: clampedTop,
                left: clampedLeft,
              });
              setShowParcelInfo(true);
            });
          }}
        />
      )}

      {/* No-parcel-matched notice -- shown once the parcel lookup for the
          selected address has settled with no match, so the fallback pin
          marker above isn't the only signal something didn't resolve.
          Absolutely positioned like the toolbar wrapper below, so it doesn't
          pan/zoom with the map. */}
      {parcelNotFound && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white border border-warning-200 shadow-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-warning-800">
            <TriangleAlert
              className="w-3 h-3 flex-shrink-0"
              aria-hidden="true"
            />
            <span>
              {t("parcels.notFoundBanner", {
                defaultValue:
                  "Couldn't find a matching parcel boundary for this address.",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Parcel-service error notice -- shown when the parcel lookup fails
          due to timeout, network error, or backend service issue. Distinct
          from the not-found message to indicate a service problem, not a
          missing parcel for a valid address. */}
      {parcelServiceError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white border border-error-200 shadow-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-error-800">
            <TriangleAlert
              className="w-3 h-3 flex-shrink-0"
              aria-hidden="true"
            />
            <span>
              {t("parcels.serviceError", {
                defaultValue:
                  "Couldn't retrieve parcel information. Please check your connection and try again.",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Locating-parcel notice -- shown while the parcel lookup for the
          selected address is in flight. The lookup is a live, uncached
          call to LINZ (see useParcelAtPoint) that can occasionally take a
          few seconds, and the map now waits for it to settle before flying
          anywhere, so this keeps that wait from looking like a dead click. */}
      {!!selectedAddress && parcelQuery.isFetching && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white border border-slate-200 shadow-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-slate-700">
            <div className="w-3 h-3 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
            <span>
              {t("parcels.locating", { defaultValue: "Locating parcel…" })}
            </span>
          </div>
        </div>
      )}

      {/* Parcel info card -- shows appellation, intent, titles only when clicked */}
      {parcelFeature &&
        showParcelInfo &&
        (() => {
          const rows = [];
          if (parcelFeature.properties.appellation !== null) {
            rows.push({
              label: t("parcels.info.appellation", {
                defaultValue: "Appellation",
              }),
              value: parcelFeature.properties.appellation,
            });
          }
          if (parcelFeature.properties.parcel_intent !== null) {
            rows.push({
              label: t("parcels.info.parcelIntent", {
                defaultValue: "Parcel intent",
              }),
              value: parcelFeature.properties.parcel_intent,
            });
          }
          if (parcelFeature.properties.titles !== null) {
            rows.push({
              label: t("parcels.info.titles", { defaultValue: "Title(s)" }),
              value: parcelFeature.properties.titles,
            });
          }
          return (
            <FeatureInfoCard
              title={t("parcels.info.title", {
                defaultValue: "Property Details",
              })}
              rows={rows}
              position={cardPosition || undefined}
              onClose={() => setShowParcelInfo(false)}
            />
          );
        })()}

      {/* Map toolbar (zoom/layers/locate) -- app-level controls (Scoring,
          Theme) live in HomeContainer now, not here. */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2">
        <MapToolbarContainer
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
        />
      </div>

      {/* Scale control - bottom left */}
      <ScaleControl position="bottomleft" imperial={false} metric={true} />

      {/* Main location marker - shown immediately on address selection, and
          as the no-parcel-matched fallback; hidden once a parcel highlight
          is drawn above so the two aren't shown together. */}
      {selectedAddress && !parcelFeature && (
        <Marker
          position={[selectedAddress.lat, selectedAddress.lon]}
          icon={createMainLocationIcon()}
        >
          <Popup>
            <div className="text-sm font-semibold">
              {selectedAddress.displayName}
            </div>
            <div className="text-xs text-slate-600">
              {selectedAddress.lat.toFixed(4)}, {selectedAddress.lon.toFixed(4)}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Category markers - show after analysis */}
      {analysisResult?.features.map((feature) => {
        if (!visibleFacilityIds.has(feature.id)) {
          return null;
        }

        const color =
          categoryColorMap[feature.category] || "rgb(var(--color-neutral-500))";
        const iconMarkup =
          categoryIconMarkupMap[feature.category] ?? defaultMarkerIconMarkup;

        return (
          <Marker
            key={feature.id}
            position={[feature.lat, feature.lon]}
            icon={createCategoryIcon(color, iconMarkup)}
          >
            <Popup minWidth={200}>
              <div className="text-sm font-semibold mb-1">{feature.name}</div>
              <div className="text-xs text-slate-600 mb-2">
                <strong>{t("map.markerPopup.distance")}:</strong>{" "}
                {feature.distanceKm.toFixed(2)} km
              </div>
              {feature.details && (
                <div className="text-xs text-slate-600 mb-2 space-y-0.5">
                  {FACILITY_DETAIL_FIELDS.map(({ key, i18nKey }) => {
                    const value = feature.details?.[key];
                    if (!value) return null;
                    const isWebsiteLink =
                      key === "website" && isValidHttpUrl(value);
                    return (
                      <div key={key}>
                        <strong>{t(i18nKey)}:</strong>{" "}
                        {isWebsiteLink ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {value}
                          </a>
                        ) : (
                          value
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {feature.details?.image && isValidHttpUrl(feature.details.image) && (
                <img
                  src={feature.details.image}
                  alt={feature.name}
                  loading="lazy"
                  className="mb-2 max-h-24 w-full rounded object-cover"
                  onError={(event) => {
                    // A URL can pass the http(s) check above and still 404 or
                    // fail to load (stale/renamed Commons file) -- hide the
                    // element rather than showing the browser's broken-image icon.
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
              <FacilityRouteModePicker
                feature={feature}
                onBackToResults={
                  isDesktop ? undefined : () => setIsMapViewOnMobile(false)
                }
              />
            </Popup>
          </Marker>
        );
      })}

      {/* Active route polyline — colour varies by transport mode */}
      {activeRoute && activeRoute.length >= 2 && (
        <Polyline
          positions={activeRoute}
          pathOptions={{
            color:
              routeMode === "walking"
                ? "rgb(var(--color-success-500))"
                : routeMode === "cycling"
                  ? "rgb(var(--color-warning-500))"
                  : "rgb(var(--color-primary-500))",
            weight: routeMode === "walking" ? 6 : 12,
            opacity: 0.75,
            dashArray: routeMode === "walking" ? "1, 15" : undefined,
            lineCap: routeMode === "walking" ? "round" : undefined,
          }}
        />
      )}

      {/* Highlighted selected facility marker — rendered on top of category markers */}
      {selectedFeature && (
        <Marker
          key={`selected-${selectedFeature.id}`}
          position={[selectedFeature.lat, selectedFeature.lon]}
          icon={createSelectedFeatureIcon(
            categoryColorMap[selectedFeature.category] ||
              "rgb(var(--color-neutral-500))",
            categoryIconMarkupMap[selectedFeature.category] ??
              defaultMarkerIconMarkup,
          )}
          zIndexOffset={1000}
          interactive={false}
        />
      )}
    </>
  );
}

/**
 * Main MapContainer component
 * Container that manages map state and renders markers based on Zustand store.
 * Business logic: reads from store, manages map effects, handles marker rendering.
 */
export function MapContainer() {
  const { selectedAddress, isAnalyzing } = useLocationStore();
  const mapRef = useRef<L.Map | null>(null);
  const mapId = useId();

  // Default map center (central New Zealand) if no address selected
  const defaultCenter: [number, number] = [-41.2865, 172.9988];
  const initialCenter: [number, number] = selectedAddress
    ? [selectedAddress.lat, selectedAddress.lon]
    : defaultCenter;

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (error) {
        // Silently ignore cleanup errors
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full" id={`map-wrapper-${mapId}`}>
      <LeafletMapContainer
        key={mapId}
        ref={mapRef}
        center={initialCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
      >
        <MapContent />
      </LeafletMapContainer>

      {/* Loading overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white shadow-card-lg rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-700">
              Analyzing...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Create a red/accent colored icon for the main location marker
 */
function createMainLocationIcon(): L.DivIcon {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: rgb(var(--color-error-500));
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    ">
      <div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "leaflet-main-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Create a colored icon for category markers
 */
function createCategoryIcon(color: string, iconMarkup: string): L.DivIcon {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    ">
      ${iconMarkup}
    </div>
  `;

  return L.divIcon({
    html,
    className: "leaflet-category-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

/**
 * Create a highlighted icon for the currently selected facility.
 * Renders a larger version with a glowing ring to distinguish it from regular markers.
 */
function createSelectedFeatureIcon(
  color: string,
  iconMarkup: string,
): L.DivIcon {
  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
    ">
      <div style="
        position: absolute;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: ${color};
        opacity: 0.2;
        border: 2px solid ${color};
        animation: leaflet-selected-pulse 1.5s ease-in-out infinite;
      "></div>
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        z-index: 1;
      ">
        ${iconMarkup}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "leaflet-selected-marker",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

export default MapContainer;
