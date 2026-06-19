import dynamic from 'next/dynamic';
import { MapContainer } from './MapContainer';

/**
 * Dynamic import of MapContainer with SSR disabled.
 * Leaflet cannot be rendered server-side, so we disable SSR for this container.
 */
export const MapContainerDynamic = dynamic(
  () => import('./MapContainer').then((mod) => ({ default: mod.MapContainer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    ),
  }
);

export { MapContainer };
