'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocationStore } from '@/store';

/**
 * useMapState hook
 *
 * Manages map center and zoom level state. Syncs with selectedAddress from
 * the global store, automatically updating map center when a new address is selected.
 *
 * Returns:
 * - `center`: [lat, lon] for current map center (defaults to Auckland)
 * - `zoom`: current zoom level (defaults to 12)
 * - `setCenter`: update map center programmatically
 * - `setZoom`: update zoom level programmatically
 */

// Default center: Auckland, New Zealand
const DEFAULT_CENTER = [-36.8485, 174.7633] as const;
const DEFAULT_ZOOM = 12;

export function useMapState() {
  const selectedAddress = useLocationStore((state) => state.selectedAddress);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Sync map center when selectedAddress changes
  useEffect(() => {
    if (selectedAddress) {
      setCenter([selectedAddress.lat, selectedAddress.lon]);
      // Zoom in slightly when user selects an address for better visibility
      setZoom(14);
    }
  }, [selectedAddress]);

  // Manual center update
  const updateCenter = useCallback((lat: number, lon: number) => {
    setCenter([lat, lon]);
  }, []);

  // Manual zoom update
  const updateZoom = useCallback((newZoom: number) => {
    setZoom(Math.max(0, Math.min(newZoom, 20))); // Constrain between 0-20
  }, []);

  return {
    center,
    zoom,
    setCenter: updateCenter,
    setZoom: updateZoom,
  };
}
