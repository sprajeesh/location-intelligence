"use client";

import React, { useCallback, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Minus, Crosshair, Navigation } from "lucide-react";
import { useLocationStore } from "@/store/index";
import { ToolbarButton } from "@/components/ToolbarButton";
import { LayerSelector, type MapLayerId } from "@/components/LayerSelector";
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

  const hasFeatures = (analysisResult?.features?.length ?? 0) > 0;

  return (
    <div
      className="
        absolute md:top-1/2 top-1/4 right-3 -translate-y-1/2 z-[1000]
        flex flex-col items-center gap-0.5
        bg-slate-900/90 backdrop-blur-md
        border border-slate-700/60
        rounded-xl shadow-2xl
        p-1
      "
      role="toolbar"
      aria-label="Map controls"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <ToolbarButton icon={Plus} label="Zoom in" onClick={handleZoomIn} />
      <ToolbarButton icon={Minus} label="Zoom out" onClick={handleZoomOut} />

      <div className="w-5 h-px bg-slate-700/60 my-0.5" role="separator" />

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

      <div className="w-5 h-px bg-slate-700/60 my-0.5" role="separator" />

      <LayerSelector activeLayer={activeLayer} onSelectLayer={onLayerChange} />
    </div>
  );
}

export default MapToolbarContainer;
