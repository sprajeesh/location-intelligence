# Toast Component - Example Usage

This file shows real-world examples of how to use the Toast notification system in Location Intelligence components.

## Example 1: SearchContainer with Address Search

```tsx
'use client';

import React from 'react';
import { useToast } from '@/components/Toast';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useLocationStore } from '@/store';

export function SearchContainer() {
  const showToast = useToast();
  const setSelectedAddress = useLocationStore((state) => state.setSelectedAddress);

  const { mutate: search, isPending } = useAddressSearch({
    onError: (error) => {
      if (error instanceof TypeError) {
        showToast('Network error. Please check your connection', 'error');
      } else {
        showToast('Search failed. Please try again', 'error');
      }
    },
  });

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      showToast('Please enter an address', 'warning');
      return;
    }

    search(query);
  };

  const handleAddressSelect = (address: AddressResult) => {
    try {
      setSelectedAddress(address);
      showToast(`Selected: ${address.displayName}`, 'success');
      // Trigger analysis mutation
    } catch (error) {
      showToast('Failed to select address', 'error');
    }
  };

  return (
    <div className="search-container">
      {/* SearchBar component */}
      {/* Results with handleAddressSelect onClick */}
    </div>
  );
}
```

## Example 2: AnalysisContainer with Location Analysis

```tsx
'use client';

import React from 'react';
import { useToast } from '@/components/Toast';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useLocationStore } from '@/store';

export function AnalysisContainer() {
  const showToast = useToast();
  const selectedAddress = useLocationStore((state) => state.selectedAddress);
  const radiusKm = useLocationStore((state) => state.radiusKm);
  const categories = useLocationStore((state) => state.visibleCategories);

  const { mutate: analyze, isPending } = useAnalyze({
    onSuccess: (data) => {
      if (data.features.length === 0) {
        showToast(
          `No facilities found within ${radiusKm}km. Try increasing your search radius.`,
          'warning'
        );
      } else {
        showToast(
          `Found ${data.features.length} facilities near you`,
          'success'
        );
      }
    },
    onError: (error) => {
      if (error.message.includes('429')) {
        showToast('Too many requests. Please wait a moment', 'error');
      } else if (error.message.includes('50')) {
        showToast('Service temporarily unavailable', 'error');
      } else {
        showToast('Failed to analyze location', 'error');
      }
    },
  });

  const handleAnalyze = () => {
    if (!selectedAddress) {
      showToast('Please select an address first', 'warning');
      return;
    }

    if (radiusKm < 1 || radiusKm > 100) {
      showToast('Radius must be between 1 and 100 km', 'error');
      return;
    }

    if (categories.size === 0) {
      showToast('Please select at least one category', 'warning');
      return;
    }

    showToast('Analyzing location...', 'info');
    analyze({
      address: selectedAddress.displayName,
      lat: selectedAddress.lat,
      lon: selectedAddress.lon,
      radiusKm,
      categories: Array.from(categories),
      distanceMode: 'driving',
    });
  };

  return (
    <div className="analysis-container">
      {/* Results panel and button */}
      <button
        onClick={handleAnalyze}
        disabled={isPending}
      >
        {isPending ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  );
}
```

## Example 3: MapView with Error Handling

```tsx
'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '@/components/Toast';
import { useLocationStore } from '@/store';

export function MapView() {
  const showToast = useToast();
  const analysisResult = useLocationStore((state) => state.analysisResult);

  useEffect(() => {
    // Fix Leaflet default icon issue in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  const handleMarkerClick = async (feature: Feature) => {
    try {
      // Handle marker click (e.g., show details, navigate)
      console.log('Clicked:', feature);
    } catch (error) {
      showToast('Failed to show facility details', 'error');
    }
  };

  const handleMapError = () => {
    showToast('Failed to load map. Please refresh', 'error');
  };

  if (!analysisResult) {
    return <div>Select an address to see the map</div>;
  }

  return (
    <div className="map-container">
      <MapContainer
        center={[analysisResult.location.lat, analysisResult.location.lon]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        onError={handleMapError}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Main location marker */}
        <Marker
          position={[analysisResult.location.lat, analysisResult.location.lon]}
        >
          <Popup>{analysisResult.location.displayName}</Popup>
        </Marker>

        {/* Facility markers */}
        {analysisResult.features.map((feature) => (
          <Marker
            key={feature.id}
            position={[feature.lat, feature.lon]}
            onClick={() => handleMarkerClick(feature)}
          >
            <Popup>
              <div>
                <strong>{feature.name}</strong>
                <p>{feature.category}</p>
                <p>{feature.distanceKm.toFixed(1)} km</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

## Example 4: API Hooks with Toast Integration

```tsx
// hooks/useAnalyze.ts
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/Toast';

export function useAnalyze() {
  const showToast = useToast();
  const setAnalysisResult = useLocationStore((state) => state.setAnalysisResult);
  const setIsAnalyzing = useLocationStore((state) => state.setIsAnalyzing);

  return useMutation({
    mutationFn: async (params: AnalyzeRequest) => {
      setIsAnalyzing(true);
      const response = await fetch('/api/location/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = new Error('Analysis failed');
        error.message = `${response.status}: ${response.statusText}`;
        throw error;
      }

      return response.json() as Promise<AnalyzeResponse>;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setIsAnalyzing(false);
      // Success toast shown in AnalysisContainer
    },
    onError: (error) => {
      setIsAnalyzing(false);
      showToast(
        error instanceof Error
          ? `Error: ${error.message}`
          : 'Failed to analyze location',
        'error'
      );
    },
  });
}
```

## Example 5: Address Search with Debounce and Toast

```tsx
// hooks/useAddressSearch.ts
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { debounce } from '@/utils/debounce';

export function useAddressSearch() {
  const showToast = useToast();

  const { mutate, isPending, data } = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim()) return [];

      const response = await fetch(`/api/search/address?q=${encodeURIComponent(query)}`);

      if (response.status === 429) {
        throw new Error('Rate limited');
      }

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data.results || [];
    },
    onError: (error) => {
      if (error.message === 'Rate limited') {
        showToast('Too many search requests. Please wait a moment', 'warning');
      } else {
        // Don't show error for normal "no results" case
        console.error('Search error:', error);
      }
    },
  });

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim()) {
        mutate(query);
      }
    }, 300),
    [mutate]
  );

  return { search: debouncedSearch, results: data || [], isPending };
}
```

## Example 6: Form Validation with Toast

```tsx
'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/Toast';

export function AddressForm() {
  const showToast = useToast();
  const [formData, setFormData] = useState({
    address: '',
    radius: 10,
    categories: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation with toasts
    if (!formData.address.trim()) {
      showToast('Please enter an address', 'warning');
      return;
    }

    if (formData.radius < 1 || formData.radius > 100) {
      showToast('Radius must be between 1 and 100 km', 'error');
      return;
    }

    if (formData.categories.length === 0) {
      showToast('Please select at least one category', 'warning');
      return;
    }

    // Form is valid
    showToast('Analyzing your search...', 'info');
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Analyze</button>
    </form>
  );
}
```

## Best Practices Summary

1. **Use appropriate types**: Match the toast type to the context
   - `error`: Failed operations, invalid input
   - `warning`: Cautions, unusual conditions
   - `success`: Confirmations, successful actions
   - `info`: Status updates, informational messages

2. **Keep messages concise**: Max ~100 characters for best UX
3. **Be specific**: Tell users what happened and why
4. **Don't spam**: Group related errors into one toast
5. **Async operations**: Show `info` toast during operation, success/error on completion
6. **Forms**: Show `warning` for validation issues, `error` for submission failures
7. **Clear errors**: Use `clearToasts()` before starting new operations if needed

## Running Tests

```bash
cd apps/web
npm run test -- Toast.test.tsx
npm run test:watch -- Toast.test.tsx
```

All examples above follow the established patterns and integrate seamlessly with the Toast system.
