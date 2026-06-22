'use client';

import React, { useEffect, useRef, useMemo, useId } from 'react';
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationStore } from '@/store/index';
import { useNavigate } from '@/hooks/useNavigate';
import { useTranslations } from 'next-intl';

/**
 * Fix Leaflet icon issue in Next.js (dynamic imports break default icon URLs)
 * Called once on module load, not on every component mount
 */
let leafletIconsFixed = false;
const fixLeafletIcons = () => {
  if (leafletIconsFixed) return;

  const iconRetinaUrl = require('leaflet/dist/images/marker-icon-2x.png').default;
  const iconUrl = require('leaflet/dist/images/marker-icon.png').default;
  const shadowUrl = require('leaflet/dist/images/marker-shadow.png').default;

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
 */
function MapContent() {
  const map = useMap();
  const {
    selectedAddress,
    analysisResult,
    visibleCategories,
    activeRoute,
    navigatingFeatureId,
    selectedFeature,
  } = useLocationStore();

  const navigate = useNavigate();
  const t = useTranslations();

  // Create category color map from analysis result
  const categoryColorMap = useMemo(() => {
    const colors: Record<string, string> = {};
    if (analysisResult?.features) {
      const seen = new Set<string>();
      for (const feature of analysisResult.features) {
        if (!seen.has(feature.category)) {
          // In a real scenario, we'd fetch categories from API to get colors
          // For now, use a default color set based on category ID
          colors[feature.category] = getCategoryColor(feature.category);
          seen.add(feature.category);
        }
      }
    }
    return colors;
  }, [analysisResult]);

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
    const { selectedAddress: addr, selectedFeature: feat } = useLocationStore.getState();
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
            <div className="text-xs text-gray-600">
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

        const color = categoryColorMap[feature.category] || '#6B7280';

        return (
          <Marker
            key={feature.id}
            position={[feature.lat, feature.lon]}
            icon={createCategoryIcon(color)}
          >
            <Popup>
              <div className="text-sm font-semibold mb-1">{feature.name}</div>
              <div className="text-xs text-gray-600 mb-2">
                <strong>{t('map.markerPopup.distance')}:</strong>{' '}
                {feature.distanceKm.toFixed(2)} km
              </div>
              <button
                onClick={() => navigate(feature)}
                disabled={navigatingFeatureId === feature.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: navigatingFeatureId === feature.id ? '#e5e7eb' : '#f9fafb',
                  cursor: navigatingFeatureId === feature.id ? 'not-allowed' : 'pointer',
                  color: '#374151',
                  padding: 0,
                }}
                title="Show route"
                aria-label={`Navigate to ${feature.name}`}
              >
                {navigatingFeatureId === feature.id ? (
                  <span style={{ fontSize: '10px' }}>…</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                )}
              </button>
            </Popup>
          </Marker>
        );
      })}

      {/* Active route polyline */}
      {activeRoute && activeRoute.length >= 2 && (
        <Polyline
          positions={activeRoute}
          pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.8 }}
        />
      )}

      {/* Highlighted selected facility marker — rendered on top of category markers */}
      {selectedFeature && (
        <Marker
          key={`selected-${selectedFeature.id}`}
          position={[selectedFeature.lat, selectedFeature.lon]}
          icon={createSelectedFeatureIcon(categoryColorMap[selectedFeature.category] || '#6B7280')}
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapContent />
      </LeafletMapContainer>

      {/* Loading overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">
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
      background: #EF4444;
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
    className: 'leaflet-main-marker',
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
    className: 'leaflet-category-marker',
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
        background: ${color}33;
        border: 2px solid ${color};
        animation: pulse 1.5s ease-in-out infinite;
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
    className: 'leaflet-selected-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

/**
 * Get a color for a category ID (fallback color mapping)
 * In production, these colors should come from the /categories API endpoint
 */
function getCategoryColor(categoryId: string): string {
  const colorMap: Record<string, string> = {
    schools: '#F59E0B',
    bus_stops: '#14B8A6',
    hospitals: '#EF4444',
    universities: '#8B5CF6',
    supermarkets: '#10B981',
    parks: '#22C55E',
    libraries: '#3B82F6',
    pharmacies: '#EC4899',
  };
  return colorMap[categoryId] || '#6B7280'; // Gray fallback
}

export default MapContainer;
