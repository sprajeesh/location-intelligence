# ResultsPanel Component

A sophisticated left-side panel (desktop) / bottom sheet (mobile) that displays location analysis results with collapsible category groups, facility listings, and comprehensive scoring.

## Features

- **Collapsible Category Groups**: Facilities grouped by category (Schools, Bus Stops, etc.)
- **Visibility Toggles**: Eye icon per category to show/hide markers on the map
- **Facility Items**: Clickable facility rows that center the map and open popups
- **Score Display**: Overall score with category breakdowns and coverage badge
- **Loading States**: Skeleton loaders while analyzing
- **Empty States**: 
  - No analysis yet: search prompt
  - No results: empty state with option to increase radius
- **Dark Theme**: Glassmorphic design with slate/blue color palette
- **Responsive**: Desktop panel + mobile bottom sheet layout
- **Accessible**: Full ARIA labels, keyboard navigation, focus management

## File Structure

```
ResultsPanel.tsx          # Main container component
├── CategoryGroup.tsx     # Collapsible group header with visibility toggle
├── FacilityItem.tsx      # Individual facility row
├── ScoreDisplay.tsx      # Overall and category scores
└── LoadingSkeleton.tsx   # Animated skeleton loaders
```

## Usage

### Basic Integration

```tsx
import ResultsPanel from '@/components/ResultsPanel';

export default function AnalysisView() {
  const handleFacilityClick = (feature: Feature) => {
    // Center map on facility, open popup
    mapRef.current?.setView([feature.lat, feature.lon], 14);
  };

  const handleIncreaseRadius = () => {
    // Increase search radius and reanalyze
    setRadiusKm((prev) => prev + 5);
  };

  return (
    <ResultsPanel
      onFacilityClick={handleFacilityClick}
      onIncreaseRadius={handleIncreaseRadius}
      className="md:max-w-md"
    />
  );
}
```

### Props

```typescript
export interface ResultsPanelProps {
  // Optional callback when a facility is clicked
  onFacilityClick?: (feature: Feature) => void;
  
  // Optional callback when radius should increase
  onIncreaseRadius?: () => void;
  
  // Optional custom className for the container
  className?: string;
}
```

## Component Behavior

### State Management

Consumes from Zustand store (`useLocationStore`):
- `analysisResult`: Current analysis result with features and scores
- `isAnalyzing`: Loading state during API call
- `radiusKm`: Current search radius for display
- `visibleCategories`: Set of visible category IDs
- `toggleCategoryVisibility()`: Toggle category visibility action

### Render States

1. **Loading**: Shows skeleton loaders while `isAnalyzing` is true
2. **No Analysis**: Shows search prompt when no analysis has been done
3. **No Results**: Shows empty state with option to increase radius
4. **Results**: Shows grouped categories, facilities, and scores

### Category Grouping

Features are automatically grouped by category ID from the backend response:
- Groups are sorted alphabetically by label
- Count badge shows number of facilities per category
- Category label is inferred from ID (kebab-case → Title Case)

### Facility Clicking

When a facility is clicked:
1. `onFacilityClick(feature)` callback is triggered
2. Container should update map view to `[feature.lat, feature.lon]`
3. Container should open Leaflet popup at that location

### Increasing Radius

When empty state "Increase Radius" button is clicked:
1. `onIncreaseRadius()` callback is triggered
2. Container should increment `radiusKm` by a reasonable amount (e.g., +5km)
3. Container should trigger new analysis with updated parameters

## Styling

### Design System

- **Dark Mode**: Slate-950 background, slate-100 foreground
- **Glass Effect**: `backdrop-filter: blur()` with `rgba` backgrounds
- **Colors**:
  - Primary: Blue-500 (focus, visibility toggle)
  - Accent: Red-500 (scores)
  - Success: Green-400 (good scores)
  - Warning: Amber-400 (warnings, degraded scores)
  - Neutral: Slate-400 (secondary text)

### Responsive

- Desktop (md+): Fixed left panel, max-width-md
- Mobile: Bottom sheet (full width, max-height 80vh)
- Scrollable content with custom scrollbar styling

### Animations

- Category expand/collapse: smooth chevron rotation
- Visibility toggle: color transition
- Hover states: subtle background and text changes
- Skeleton loaders: pulse animation
- Toast notifications: fade in/out

## Accessibility

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Tab through category headers and facility items
- **Focus Management**: Visible focus rings on all buttons
- **Screen Reader Support**:
  - Category count badges
  - Visibility toggle state (aria-pressed)
  - Expanded state (aria-expanded)
  - Clickable item descriptions

## Translation Keys

Required in i18n JSON files:

```json
{
  "results": {
    "title": "Results",
    "searchPrompt": "Search an address to get started",
    "noFacilities": "No facilities found within {radius}km. Try increasing your search radius.",
    "increaseRadius": "Increase Radius"
  },
  "distance": {
    "km": "{distance} km"
  },
  "score": {
    "title": "Location Score",
    "overall": "Overall",
    "coverage": "Based on {count} of {total} categories",
    "education": "Education",
    "transport": "Transport",
    "healthcare": "Healthcare",
    "shopping": "Shopping"
  }
}
```

## Related Components

- **SearchBar**: Address input with autocomplete
- **MapView**: Leaflet map visualization
- **ScoreDisplay**: Score breakdown and warnings
- **LoadingSkeleton**: Animated loaders
- **FacilityItem**: Individual facility row
- **CategoryGroup**: Category header with toggle

## Performance Notes

- Categories and facilities are memoized (`useMemo`)
- Category expansion state is local (no store pollution)
- Event handlers are wrapped in `useCallback` to prevent re-renders
- Max 500 markers supported (enforced by backend/map)

## Future Enhancements

- [ ] Virtual scrolling for large facility lists (1000+)
- [ ] Facility filtering by name or distance
- [ ] Sort facilities by distance or name
- [ ] Facility details modal on click (instead of map center)
- [ ] Undo button for radius changes
- [ ] Export results as CSV/GeoJSON
