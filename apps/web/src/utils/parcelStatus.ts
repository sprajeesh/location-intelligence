export type ParcelStatus = "idle" | "locating" | "found" | "notFound" | "error";

export interface ParcelLookupState {
  /** Whether an address is currently selected (the lookup only runs for one). */
  hasAddress: boolean;
  isFetching: boolean;
  isError: boolean;
  /** `null` means the lookup settled with no matching parcel. */
  data: unknown;
}

/**
 * Collapses the parcel lookup's flags into one status, so the map shows at
 * most one parcel notice. Fetching wins over error so a retry in flight reads
 * as "locating" rather than a stale error.
 */
export function computeParcelStatus({
  hasAddress,
  isFetching,
  isError,
  data,
}: ParcelLookupState): ParcelStatus {
  if (!hasAddress) return "idle";
  if (isFetching) return "locating";
  if (isError) return "error";
  if (data === null) return "notFound";
  return data ? "found" : "idle";
}
