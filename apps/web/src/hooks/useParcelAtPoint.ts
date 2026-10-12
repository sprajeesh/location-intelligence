"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchParcelAtPoint } from "@/services/api";
import { useLocationStore } from "@/store/index";
import type { AddressResult } from "@/types/api";
import { createTraceId } from "@/lib/tracing";

/**
 * useParcelAtPoint hook
 *
 * Resolves the currently selected address to its cadastral parcel via
 * GET /api/parcels, so MapContainer can highlight the parcel
 * polygon instead of a plain pin. Disabled until an address is selected --
 * the query key includes lat/lon so a new address selection refetches
 * (and transiently clears `parcelFeature`).
 */
export function useParcelAtPoint(selectedAddress: AddressResult | null) {
  const setParcelFeature = useLocationStore((s) => s.setParcelFeature);

  // One correlation ID per point. Retries of the same lookup reuse it.
  const correlationId = useMemo(
    () => createTraceId(),
    [selectedAddress?.lat, selectedAddress?.lon],
  );

  const query = useQuery({
    queryKey: ["parcel-at-point", selectedAddress?.lat, selectedAddress?.lon],
    queryFn: () =>
      fetchParcelAtPoint(selectedAddress!.lat, selectedAddress!.lon, correlationId),
    enabled: selectedAddress !== null,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  useEffect(() => {
    setParcelFeature(query.data ?? null);
  }, [query.data, setParcelFeature]);

  return query;
}
