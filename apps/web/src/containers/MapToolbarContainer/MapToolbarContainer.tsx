"use client";

import React, { useCallback, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Minus, Crosshair, Navigation, TriangleAlert } from "lucide-react";
import { useLocationStore } from "@/store/index";
import { ToolbarButton } from "@/components/ToolbarButton";
import { LayerSelector, type MapLayerId } from "@/components/LayerSelector";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import type { Feature } from "@/types/api";

export const TILE_LAYER_URLS: Record<MapLayerId, string> = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

export const TILE_LAYER_ATTRIBUTIONS: Record<MapLayerId, string> = {
  default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite:
    'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  topo: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
};

// Real per-provider zoom ceilings (verified against each tile server --
// requests past these return errors (OSM) or byte-identical placeholder
// tiles (Esri/OpenTopoMap), not genuine extra detail). Without an explicit
// maxZoom, Leaflet's TileLayer falls back to its own default of 18, which
// is wrong for every layer here (too low for default/satellite, too high
// for topo) and was the reason the parcel-fit flyToBounds could get stuck
// short of a full zoom-in.
export const TILE_LAYER_MAX_ZOOM: Record<MapLayerId, number> = {
  default: 19,
  satellite: 19,
  topo: 17,
};

export interface MapToolbarContainerProps {
  activeLayer: MapLayerId;
  onLayerChange: (layer: MapLayerId) => void;
}

export function MapToolbarContainer({
  activeLayer,
  onLayerChange,
}: MapToolbarContainerProps) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const analysisResult = useLocationStore((s) => s.analysisResult);
  const hazardLayerVisible = useLocationStore((s) => s.hazardLayerVisible);
  const toggleHazardLayerVisible = useLocationStore((s) => s.toggleHazardLayerVisible);

  const handleZoomIn = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      map.zoomIn();
    },
    [map],
  );

  const handleZoomOut = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      map.zoomOut();
    },
    [map],
  );

  const handleZoomToFeatures = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      const features: Feature[] | undefined = analysisResult?.features;
      if (!features || features.length === 0) return;

      const bounds = L.latLngBounds([]);
      if (selectedAddress) {
        bounds.extend([selectedAddress.lat, selectedAddress.lon]);
      }
      for (const feature of features) {
        bounds.extend([feature.lat, feature.lon]);
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    },
    [analysisResult, selectedAddress, map],
  );

  const handleCurrentLocation = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (!navigator.geolocation) return;

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 15, { duration: 1.5 });
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    },
    [map],
  );

  const handleToggleHazardLayer = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      toggleHazardLayerVisible();
    },
    [toggleHazardLayerVisible],
  );

  const hasFeatures = (analysisResult?.features?.length ?? 0) > 0;

  return (
    <SurfacePanel
      variant="toolbar"
      className="flex flex-col items-center gap-0.5 p-1"
      role="toolbar"
      aria-label="Map controls"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <ToolbarButton icon={Plus} label="Zoom in" onClick={handleZoomIn} />
      <ToolbarButton icon={Minus} label="Zoom out" onClick={handleZoomOut} />

      <div className="w-5 h-px bg-slate-200 my-0.5" role="separator" />

      <ToolbarButton
        icon={Crosshair}
        label="Zoom to features"
        onClick={handleZoomToFeatures}
        disabled={!hasFeatures}
      />
      <ToolbarButton
        icon={Navigation}
        label={isLocating ? "Locating..." : "Current location"}
        onClick={handleCurrentLocation}
        disabled={isLocating}
      />

      <div className="w-5 h-px bg-slate-200 my-0.5" role="separator" />

      <ToolbarButton
        icon={TriangleAlert}
        label={hazardLayerVisible ? "Hide hazard layer" : "Show hazard layer"}
        onClick={handleToggleHazardLayer}
        active={hazardLayerVisible}
      />

      <div className="w-5 h-px bg-slate-200 my-0.5" role="separator" />

      <LayerSelector activeLayer={activeLayer} onSelectLayer={onLayerChange} />
    </SurfacePanel>
  );
}

export default MapToolbarContainer;
