'use client';

import dynamic from 'next/dynamic';
import { SearchContainer } from '@/containers/SearchContainer';
import { AnalysisContainer } from '@/containers/AnalysisContainer';
import { DistanceToggle } from '@/components/DistanceToggle';

const MapViewDynamic = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900 flex items-center justify-center">Loading map...</div>,
});

export default function HomePage() {
  return (
    <div className="w-full h-screen flex flex-col bg-gray-900 text-white">
      {/* Top bar with search, radius, and distance mode */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchContainer />
        </div>
        <div className="flex items-center gap-2">
          <DistanceToggle />
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Results panel - left side (desktop) or bottom sheet (mobile) */}
        <div className="hidden lg:block lg:w-80 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-r border-gray-700 overflow-y-auto">
          <AnalysisContainer />
        </div>

        {/* Map - full width behind panels */}
        <div className="flex-1 relative">
          <MapViewDynamic />
        </div>

        {/* Mobile bottom sheet - shown on smaller screens */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 max-h-96 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-t border-gray-700 rounded-t-lg overflow-y-auto shadow-2xl">
          <AnalysisContainer />
        </div>
      </div>
    </div>
  );
}
