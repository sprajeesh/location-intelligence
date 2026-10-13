import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker, Popup, Polyline } from "react-leaflet";
import type L from "leaflet";
import { House } from "lucide-react";
import type { AddressResult, Feature, RouteTransportMode } from "@/types/api";
import { createHouseIcon, createMainLocationIcon } from "@/utils/mapIcons";
import { routeStyleForMode } from "@/utils/mapRouteStyle";
import { SELECTED_FEATURE_Z_OFFSET } from "./mapConstants";
import { FacilityPopupContent } from "./FacilityPopupContent";

export interface AddressMarkerProps {
  address: AddressResult;
  /** True once a parcel matches: shows the house icon instead of the pin. */
  matched: boolean;
  onHouseClick: (latlng: L.LatLng) => void;
}

/**
 * The searched address. Shows a red pin until a parcel matches, then swaps to
 * a house icon whose click opens the parcel details card.
 */
export function AddressMarker({ address, matched, onHouseClick }: AddressMarkerProps) {
  const pinIcon = useMemo(() => createMainLocationIcon(), []);
  const houseIcon = useMemo(
    () =>
      createHouseIcon(
        renderToStaticMarkup(
          <House color="rgb(var(--color-ink))" size={16} strokeWidth={2.5} />,
        ),
      ),
    [],
  );
  const position: [number, number] = [address.lat, address.lon];

  if (matched) {
    return (
      <Marker
        position={position}
        icon={houseIcon}
        eventHandlers={{ click: (e) => onHouseClick(e.latlng) }}
      />
    );
  }

  return (
    <Marker position={position} icon={pinIcon}>
      <Popup>
        <div className="text-sm font-semibold">{address.displayName}</div>
        <div className="text-xs text-slate-600">
          {address.lat.toFixed(4)}, {address.lon.toFixed(4)}
        </div>
      </Popup>
    </Marker>
  );
}

export interface FacilityMarkerProps {
  feature: Feature;
  icon: L.DivIcon;
  onBackToResults?: () => void;
}

/** A visible facility on the map, with a popup of its details. */
export function FacilityMarker({ feature, icon, onBackToResults }: FacilityMarkerProps) {
  return (
    <Marker position={[feature.lat, feature.lon]} icon={icon}>
      <Popup minWidth={200}>
        <FacilityPopupContent feature={feature} onBackToResults={onBackToResults} />
      </Popup>
    </Marker>
  );
}

export interface ActiveRouteLayerProps {
  positions: [number, number][];
  mode: RouteTransportMode;
}

/** The turn-by-turn route polyline, styled by transport mode. */
export function ActiveRouteLayer({ positions, mode }: ActiveRouteLayerProps) {
  return <Polyline positions={positions} pathOptions={routeStyleForMode(mode)} />;
}

export interface SelectedFeatureMarkerProps {
  feature: Feature;
  icon: L.DivIcon;
}

/**
 * Highlight ring over the selected facility. Sits above the regular markers
 * and isn't interactive, so it never intercepts clicks meant for the marker
 * underneath.
 */
export function SelectedFeatureMarker({ feature, icon }: SelectedFeatureMarkerProps) {
  return (
    <Marker
      position={[feature.lat, feature.lon]}
      icon={icon}
      zIndexOffset={SELECTED_FEATURE_Z_OFFSET}
      interactive={false}
    />
  );
}
