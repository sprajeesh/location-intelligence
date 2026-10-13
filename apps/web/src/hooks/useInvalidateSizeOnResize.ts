import { useEffect } from "react";
import type { Map as LeafletMap } from "leaflet";

/**
 * Leaflet 1.9's trackResize only reacts to the browser window's own 'resize'
 * event, so a map whose container changes size purely through CSS layout would
 * keep a stale tile grid. Observe the container directly and re-measure it.
 */
export function useInvalidateSizeOnResize(map: LeafletMap) {
  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [map]);
}
