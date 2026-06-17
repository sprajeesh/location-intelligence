import dynamic from 'next/dynamic';

/**
 * Dynamic import of MapView component with SSR disabled.
 * Leaflet cannot be rendered server-side, so we disable SSR for this component.
 */
export const MapViewDynamic = dynamic(
  () => import('./MapView').then((mod) => ({ default: mod.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    ),
  }
);
