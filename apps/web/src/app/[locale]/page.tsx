'use client';

import { SearchContainer } from '@/containers/SearchContainer';
import { AnalysisContainer } from '@/containers/AnalysisContainer';
import { RadiusSelectorContainer } from '@/containers/RadiusSelectorContainer';
import { MapContainerDynamic } from '@/containers/MapContainer';
import DistanceToggle from '@/components/DistanceToggle';

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map fills the entire viewport — rendered first so it is the base layer */}
      <div className="absolute inset-0 z-0">
        <MapContainerDynamic />
      </div>

      {/* Floating top bar: search | radius | distance */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-4 pointer-events-none">
        <div className="flex-1 max-w-md pointer-events-auto">
          <SearchContainer />
        </div>
        <div className="flex-shrink-0 pointer-events-auto">
          <RadiusSelectorContainer />
        </div>
        <div className="flex-shrink-0 pointer-events-auto">
          <DistanceToggle />
        </div>
      </div>

      {/* Floating results panel: top-left, below the search bar */}
      {/* AnalysisContainer handles its own visibility via selectedAddress */}
      <div className="absolute top-[4.5rem] left-4 z-10 w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7rem)] pointer-events-auto">
        <AnalysisContainer />
      </div>
    </div>
  );
}
