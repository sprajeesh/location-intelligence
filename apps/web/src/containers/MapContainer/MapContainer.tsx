"use client";

import { useEffect, useRef, useMemo, useId, useState } from "react";
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
import { Navigation, TriangleAlert } from "lucide-react";
import { useLocationStore } from "@/store/index";
import { useNavigate } from "@/hooks/useNavigate";
import { useCategories } from "@/hooks/useCategories";
import { useHazardCells } from "@/hooks/useHazardCells";
import { getHazardCellColor } from "@/utils/hazardColor";
import { buildHazardTooltipHtml } from "@/utils/hazardTooltip";
import { HazardLegend } from "@/components/HazardLegend";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { HazardCellFeature } from "@/types/hazard";
import { useTranslations } from "next-intl";
import {
  MapToolbarContainer,
  TILE_LAYER_URLS,
  TILE_LAYER_ATTRIBUTIONS,
  type MapLayerId,
} from "@/containers/MapToolbarContainer";

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
    visibleCategories,
    activeRoute,
    selectedFeature,
    routeMode,
    hazardLayerVisible,
    hazardCells,
    theme,
    setHoveredHazardCellId,
    setSelectedHazardCellId,
  } = useLocationStore();

  const navigate = useNavigate();
  const t = useTranslations();
  const { categories } = useCategories();
  const hazardCellsQuery = useHazardCells(hazardLayerVisible);

  const [activeLayer, setActiveLayer] = useState<MapLayerId>("default");

  // Dark mode re-colors the 'default' (OSM) tiles with a CSS filter instead
  // of swapping to a separate dark tile provider (e.g. CARTO's dark_all) --
  // that keeps every OSM label/POI/road on screen (a dedicated dark basemap
  // ships far fewer features) and needs no second tile source to maintain.
  // Satellite/topo imagery isn't re-styleable this way, so it's left as-is.
  const isDarkDefault = theme === "dark" && activeLayer === "default";
  const tileUrl = TILE_LAYER_URLS[activeLayer];
  const tileAttribution = TILE_LAYER_ATTRIBUTIONS[activeLayer];

  // First custom Leaflet pane in this codebase -- puts the hazard polygons
  // above the tile layer but below markers/popups (default overlayPane is
  // 400, markerPane is 600), so category/main markers always stay on top
  // and clickable.
  useEffect(() => {
    if (!map.getPane("hazardPane")) {
      const pane = map.createPane("hazardPane");
      pane.style.zIndex = "350";
      pane.style.pointerEvents = "auto";
    }
  }, [map]);

  // Map category id -> DB-configured color, from GET /categories
  const categoryColorMap = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const category of categories) {
      colors[category.id] = category.color;
    }
    return colors;
  }, [categories]);

  // Fly to selected address when it changes (before analysis)
  useEffect(() => {
    if (!selectedAddress) return;
    map.flyTo([selectedAddress.lat, selectedAddress.lon], 14);
  }, [selectedAddress, map]);

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

  // Fit map bounds to all features when analysis result changes
  useEffect(() => {
    if (!analysisResult?.features || analysisResult.features.length === 0) {
      return;
    }

    const bounds = L.latLngBounds([]);

    // Add main location marker
    if (selectedAddress) {
      bounds.extend([selectedAddress.lat, selectedAddress.lon]);
    }

    // Add all feature markers
    for (const feature of analysisResult.features) {
      bounds.extend([feature.lat, feature.lon]);
    }

    if (bounds.isValid()) {
      // Fit bounds with padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [analysisResult, map, selectedAddress]);

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
        className={isDarkDefault ? "map-tiles-inverted" : undefined}
      />

      {/* Hazard layer -- GeoJSON polygon overlay, this codebase's first.
          Rendered via react-leaflet's <GeoJSON> (many imperative Leaflet
          layers under one declarative data prop), not per-feature <Marker>s. */}
      {hazardLayerVisible && hazardCells && (
        <GeoJSON
          // react-leaflet's GeoJSON layer doesn't diff `data` -- it only
          // updates when React remounts it, so the key must change whenever
          // the collection's content changes, not just its length. TanStack
          // Query bumps dataUpdatedAt on every successful fetch (including a
          // refetch of the same bbox after cache invalidation), so it's a
          // free, correct revision marker without hashing feature content.
          key={hazardCellsQuery.dataUpdatedAt}
          data={hazardCells as unknown as GeoJSON.FeatureCollection}
          pane="hazardPane"
          style={(feature) => {
            const props = feature?.properties as HazardCellFeature["properties"];
            return {
              color: "rgb(var(--color-neutral-900))",
              weight: 1,
              fillColor: getHazardCellColor(props.composite),
              fillOpacity: 0.55,
            };
          }}
          onEachFeature={(feature, layer) => {
            const props = feature.properties as HazardCellFeature["properties"];
            layer.bindTooltip(buildHazardTooltipHtml(props), {
              sticky: true,
              className: "hazard-tooltip",
            });
            layer.on("mouseover", () => setHoveredHazardCellId(props.cellId));
            layer.on("mouseout", () => setHoveredHazardCellId(null));
            layer.on("click", () => setSelectedHazardCellId(props.cellId));
          }}
        />
      )}

      {/* Theme toggle + map toolbar -- grouped in one positioning wrapper so
          the toggle sits directly above the toolbar as a separate card,
          not a button inside it, while both stay vertically centered
          together on every screen size. */}
      <div className="absolute md:top-1/2 top-1/4 right-3 -translate-y-1/2 z-[1000] flex flex-col items-center gap-2">
        <ThemeToggle />
        <MapToolbarContainer
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
        />
      </div>

      {/* Scale control - bottom left */}
      <ScaleControl position="bottomleft" imperial={false} metric={true} />

      {/* Main location marker - show immediately on address selection */}
      {selectedAddress && (
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
        if (!visibleCategories.has(feature.category)) {
          return null;
        }

        const color = categoryColorMap[feature.category] || "rgb(var(--color-neutral-500))";

        return (
          <Marker
            key={feature.id}
            position={[feature.lat, feature.lon]}
            icon={createCategoryIcon(color)}
          >
            <Popup>
              <div className="text-sm font-semibold mb-1">{feature.name}</div>
              <div className="text-xs text-slate-600 mb-2">
                <strong>{t("map.markerPopup.distance")}:</strong>{" "}
                {feature.distanceKm.toFixed(2)} km
              </div>
              <button
                type="button"
                onClick={() => navigate(feature)}
                className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-300 bg-slate-50 text-slate-700 cursor-pointer p-0"
                title="Show route"
                aria-label={`Navigate to ${feature.name}`}
              >
                <Navigation style={{ width: "14px", height: "14px" }} />
              </button>
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
            weight: 12,
            opacity: 0.75,
          }}
        />
      )}

      {/* Highlighted selected facility marker — rendered on top of category markers */}
      {selectedFeature && (
        <Marker
          key={`selected-${selectedFeature.id}`}
          position={[selectedFeature.lat, selectedFeature.lon]}
          icon={createSelectedFeatureIcon(
            categoryColorMap[selectedFeature.category] || "rgb(var(--color-neutral-500))",
          )}
          zIndexOffset={1000}
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
  const { selectedAddress, isAnalyzing, hazardLayerVisible, hazardCells } = useLocationStore();
  const mapRef = useRef<L.Map | null>(null);
  const mapId = useId();
  const t = useTranslations();

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

      {/* Hazard layer chrome -- fixed to the viewport (outside the Leaflet
          map tree) so it doesn't pan/zoom with the map, unlike the toolbar
          which lives inside MapContent and is a Leaflet-aware control. */}
      {hazardLayerVisible && hazardCells && (
        <>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-white border border-warning-200 shadow-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-warning-800">
              <TriangleAlert className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span>
                {t("hazard.mapBanner", {
                  defaultValue:
                    "Illustrative hazard estimate — grid-cell resolution, not a LIM or property-specific advice.",
                })}
              </span>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 z-[1000] pointer-events-auto">
            <HazardLegend />
          </div>
        </>
      )}

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
function createCategoryIcon(color: string): L.DivIcon {
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
      <div style="
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
      "></div>
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
function createSelectedFeatureIcon(color: string): L.DivIcon {
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
        <div style="
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
        "></div>
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
