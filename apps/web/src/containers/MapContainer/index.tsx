import dynamic from 'next/dynamic';

/**
 * Dynamic import of MapContainer with SSR disabled.
 * Leaflet cannot be rendered server-side, so we disable SSR for this container.
 * Note: this file must not statically import from './MapContainer' — that
 * module touches `window` at module-eval time (react-leaflet), which would
 * crash SSR for any page importing from this barrel, dynamic wrapper or not.
 */
export const MapContainerDynamic = dynamic(
  () => import('./MapContainer').then((mod) => ({ default: mod.MapContainer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
        <div className="text-slate-500">Loading map...</div>
      </div>
    ),
  }
);
