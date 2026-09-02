"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchParcelAtPoint } from "@/services/api";
import { useLocationStore } from "@/store/index";
import type { AddressResult } from "@/types/api";

/**
 * useParcelAtPoint hook
 *
 * Resolves the currently selected address to its cadastral parcel via
 * GET /api/parcels/at-point, so MapContainer can highlight the parcel
 * polygon instead of a plain pin. Disabled until an address is selected --
 * the query key includes lat/lon so a new address selection refetches
 * (and transiently clears `parcelFeature`, same idiom as useHazardCells).
 */
export function useParcelAtPoint(selectedAddress: AddressResult | null) {
  const setParcelFeature = useLocationStore((s) => s.setParcelFeature);

  const query = useQuery({
    queryKey: ["parcel-at-point", selectedAddress?.lat, selectedAddress?.lon],
    queryFn: () => fetchParcelAtPoint(selectedAddress!.lat, selectedAddress!.lon),
    enabled: selectedAddress !== null,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  useEffect(() => {
    setParcelFeature(query.data ?? null);
  }, [query.data, setParcelFeature]);

  return query;
}
