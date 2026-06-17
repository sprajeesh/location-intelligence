# Toast Integration Guide

This guide explains how to integrate the Toast notification system throughout the Location Intelligence web app.

## Setup (Already Done)

The Toast system has been integrated into the app. Here's what was set up:

### 1. Zustand Store Extended

Updated `/src/store/index.ts` to include:
- `Toast` interface with `id`, `message`, `type`, and `dismissible` properties
- `toasts: Toast[]` state in the store
- `addToast()`, `removeToast()`, and `clearToasts()` actions

### 2. Toast Component Created

`/src/components/Toast.tsx` exports:
- `ToastContainer` — renders all active toasts in top-right corner
- `useToast()` hook — shows a toast with `showToast(message, type)`

### 3. ToastContainer Added to Layout

`/src/app/[locale]/layout.tsx` now renders `<ToastContainer />` at the app root.

## Using Toasts in Your Components

### Basic Usage with Hook

```tsx
'use client';

import { useToast } from '@/components/Toast';

export function SearchBar() {
  const showToast = useToast();

  const handleSearch = async (query: string) => {
    try {
      const response = await fetch(`/api/search/address?q=${query}`);
      if (!response.ok) {
        showToast('Search failed', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again', 'error');
    }
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### Showing Success Toast

```tsx
const showToast = useToast();

const handleAnalyze = async () => {
  try {
    await analyzeLocation(selectedAddress);
    showToast('Analysis complete!', 'success');
  } catch (error) {
    showToast('Analysis failed', 'error');
  }
};
```

### Using the Store Directly

For more control or complex scenarios:

```tsx
import { useLocationStore } from '@/store';

export function MyComponent() {
  const addToast = useLocationStore((state) => state.addToast);
  const removeToast = useLocationStore((state) => state.removeToast);

  const handleAction = () => {
    addToast({
      message: 'Custom error',
      type: 'error',
      dismissible: true,
    });
  };

  return <button onClick={handleAction}>Show Toast</button>;
}
```

## Common Error Scenarios

### API Error Handling

In `SearchContainer.tsx`:

```tsx
const { mutate: search } = useMutation({
  mutationFn: async (address: string) => {
    const response = await fetch(`/api/search/address?q=${address}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
  onError: (error) => {
    showToast('Search failed. Please try again', 'error');
  },
});
```

### React Query Integration

In API hooks like `useAnalyze.ts`:

```tsx
import { useToast } from '@/components/Toast';

export function useAnalyze() {
  const showToast = useToast();

  return useMutation({
    mutationFn: async (params) => {
      const response = await fetch('/api/location/analyze', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
    },
    onError: (error) => {
      if (error instanceof TypeError) {
        showToast('Service temporarily unavailable', 'error');
      } else {
        showToast('Failed to analyze location', 'error');
      }
    },
  });
}
```

### Form Validation

```tsx
const showToast = useToast();

const handleSubmit = (formData) => {
  if (!formData.address) {
    showToast('Please enter an address', 'warning');
    return;
  }

  // Continue with submission...
};
```

## Toast Types & Styling Reference

| Type | Color | Icon | Usage |
|------|-------|------|-------|
| `error` | Red | X circle | Failed actions, errors |
| `warning` | Amber | Triangle | User caution, issues |
| `success` | Green | Checkmark | Successful actions |
| `info` | Blue | Info circle | Information, status updates |

## Best Practices

### 1. Be Specific with Messages

Good:
```tsx
showToast('No facilities found within 10km radius', 'warning');
```

Bad:
```tsx
showToast('Error', 'error');
```

### 2. Match Type to Context

```tsx
// Use 'error' for failures
showToast('Network error', 'error');

// Use 'warning' for cautions
showToast('Radius exceeds 50km, may take longer', 'warning');

// Use 'success' for confirmations
showToast('Location saved successfully', 'success');

// Use 'info' for status
showToast('Searching nearby facilities...', 'info');
```

### 3. Handle Network Errors Gracefully

```tsx
try {
  const response = await fetch('/api/location/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    showToast('Too many requests. Please wait a moment', 'error');
  } else if (response.status >= 500) {
    showToast('Service temporarily unavailable', 'error');
  } else if (!response.ok) {
    showToast('Request failed', 'error');
  }
} catch (error) {
  showToast('Network error. Check your connection', 'error');
}
```

### 4. Don't Spam Toasts

Group related errors:

Bad:
```tsx
results.forEach((result) => {
  if (!result.valid) {
    showToast(`Invalid: ${result.name}`, 'error'); // Multiple toasts!
  }
});
```

Good:
```tsx
const invalid = results.filter((r) => !r.valid);
if (invalid.length > 0) {
  showToast(
    `${invalid.length} items are invalid`,
    'error'
  );
}
```

### 5. Clear Toasts When Appropriate

```tsx
const { addToast, clearToasts } = useLocationStore((state) => ({
  addToast: state.addToast,
  clearToasts: state.clearToasts,
}));

const handleNewSearch = () => {
  clearToasts(); // Remove old toasts before new search
  // Start new search...
};
```

## Components to Update

When building these components, integrate toasts as shown:

### SearchContainer.tsx

```tsx
import { useToast } from '@/components/Toast';

export function SearchContainer() {
  const showToast = useToast();

  const handleAddressSelect = async (address: AddressResult) => {
    try {
      setSelectedAddress(address);
      // Trigger analysis...
    } catch (error) {
      showToast('Failed to select address', 'error');
    }
  };

  return (
    // Component JSX
  );
}
```

### AnalysisContainer.tsx

```tsx
export function AnalysisContainer() {
  const showToast = useToast();
  const { mutate: analyze } = useAnalyze({
    onError: () => showToast('Analysis failed', 'error'),
  });

  return (
    // Component JSX
  );
}
```

### MapView.tsx

```tsx
export function MapView() {
  const showToast = useToast();

  const handleMarkerClick = (marker) => {
    try {
      // Handle marker interaction
    } catch (error) {
      showToast('Failed to show facility details', 'error');
    }
  };

  return (
    // Component JSX
  );
}
```

## Testing

When testing components that use toasts:

```tsx
import { useLocationStore } from '@/store';
import { render, screen } from '@testing-library/react';

beforeEach(() => {
  useLocationStore.setState({ toasts: [] });
});

test('shows error toast on API failure', async () => {
  // Setup mock to fail
  jest.mock('@/services/api', () => ({
    analyzeLocation: jest.fn().mockRejectedValue(new Error()),
  }));

  render(<MyComponent />);

  // Trigger action that fails
  // Assert toast appears
  expect(useLocationStore.getState().toasts).toHaveLength(1);
  expect(useLocationStore.getState().toasts[0].type).toBe('error');
});
```

## Troubleshooting

### Toasts Not Appearing

1. Verify `<ToastContainer />` is in your layout
2. Check that component is marked with `'use client'`
3. Ensure `useToast()` is called before being rendered

### Toasts Not Auto-Dismissing

The 3-second auto-dismiss is hardcoded. To change it, edit the timeout in `Toast.tsx`:

```tsx
const timer = setTimeout(() => {
  removeToast(toast.id);
}, 3000); // Change this number
```

### Memory Leaks from Timers

The `useEffect` cleanup in `ToastItem` handles timer cleanup automatically. No action needed.

### Styling Issues

Ensure:
1. Tailwind CSS is properly configured
2. `globals.css` is imported in root layout
3. `dark` mode is enabled in `tailwind.config.js`

## Summary

- Import `useToast` in components: `import { useToast } from '@/components/Toast'`
- Call hook: `const showToast = useToast()`
- Show toast: `showToast('Message', 'error' | 'warning' | 'success' | 'info')`
- Toasts appear in top-right, auto-dismiss after 3s
- Users can manually dismiss with close button
- Store provides `addToast`, `removeToast`, `clearToasts` for advanced usage
