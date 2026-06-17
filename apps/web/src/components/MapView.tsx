'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  LayerGroup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationStore } from '@/store/index';
import { useTranslations } from 'next-intl';

/**
 * Fix Leaflet icon issue in Next.js (dynamic imports break default icon URLs)
 */
const fixLeafletIcons = () => {
  const iconRetinaUrl = require('leaflet/dist/images/marker-icon-2x.png').default;
  const iconUrl = require('leaflet/dist/images/marker-icon.png').default;
  const shadowUrl = require('leaflet/dist/images/marker-shadow.png').default;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });
};

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
  } = useLocationStore();

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

  if (!selectedAddress || !analysisResult) {
    return null;
  }

  return (
    <>
      {/* Main location marker (red/accent color) */}
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

      {/* Category markers grouped by visibility */}
      {analysisResult.features.map((feature) => {
        // Only render if category is visible
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
              <div className="text-sm font-semibold">{feature.name}</div>
              <div className="text-xs text-gray-600">
                <div>
                  <strong>{t('map.markerPopup.category')}:</strong>{' '}
                  {feature.category}
                </div>
                <div>
                  <strong>{t('map.markerPopup.distance')}:</strong>{' '}
                  {feature.distanceKm.toFixed(2)} km
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

/**
 * Main MapView component
 * Renders a React Leaflet map with OpenStreetMap tiles and markers
 */
export function MapView() {
  const { selectedAddress, analysisResult, isAnalyzing } = useLocationStore();
  const mapRef = useRef<L.Map | null>(null);

  // Fix Leaflet icons once on mount
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // Default map center (central New Zealand) if no address selected
  const defaultCenter: [number, number] = [-41.2865, 172.9988];
  const initialCenter: [number, number] = selectedAddress
    ? [selectedAddress.lat, selectedAddress.lon]
    : defaultCenter;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={initialCenter}
        zoom={12}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapContent />
      </MapContainer>

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
function createMainLocationIcon(): L.Icon {
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
function createCategoryIcon(color: string): L.Icon {
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

export default MapView;
