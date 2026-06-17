# Toast Component

Global toast/snackbar notification system for displaying error, warning, success, and info messages. Toasts auto-dismiss after 3 seconds and are managed via Zustand store.

## Features

- Auto-dismiss after 3 seconds (configurable per toast)
- Type-specific styling (error, warning, success, info)
- Top-right fixed positioning
- Dismissible via close button
- Accessible with ARIA labels and roles
- Animations (fade-in, slide-in)
- Dark mode glassmorphism design

## Files

- `Toast.tsx` — Toast component and hooks
- `Toast.test.tsx` — Comprehensive test suite

## Components

### ToastContainer

Renders all active toasts. Add this component once in your root layout (typically in `[locale]/layout.tsx`).

```tsx
import { ToastContainer } from '@/components/Toast';

export default function RootLayout({ children }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
```

### useToast Hook

Hook to programmatically show a toast notification.

```tsx
import { useToast } from '@/components/Toast';

export function MyComponent() {
  const showToast = useToast();

  const handleError = () => {
    showToast('Something went wrong', 'error');
  };

  return <button onClick={handleError}>Trigger Error</button>;
}
```

## Usage Examples

### Basic Error Toast

```tsx
const showToast = useToast();

try {
  await analyzeLocation(...);
} catch (error) {
  showToast('Failed to analyze location', 'error');
}
```

### Success Toast

```tsx
const showToast = useToast();

// After successful operation
showToast('Location analyzed successfully', 'success');
```

### Warning Toast

```tsx
const showToast = useToast();

if (radiusKm > 20) {
  showToast('Searching large radius may take longer', 'warning');
}
```

### Info Toast

```tsx
const showToast = useToast();

showToast('Searching for nearby facilities...', 'info');
```

### Using Store Directly

For more control, use the Zustand store directly:

```tsx
import { useLocationStore } from '@/store';

export function MyComponent() {
  const addToast = useLocationStore((state) => state.addToast);

  const handleClick = () => {
    addToast({
      message: 'Custom message',
      type: 'error',
      dismissible: false, // Don't show close button
    });
  };

  return <button onClick={handleClick}>Show Toast</button>;
}
```

## Toast Configuration

### Type

- `'error'` — Red styling, X icon
- `'warning'` — Amber styling, triangle icon
- `'success'` — Green styling, checkmark icon
- `'info'` — Blue styling, info icon

### Dismissible

Optional boolean (defaults to `true`). When `false`, the close button is hidden, though the toast still auto-dismisses after 3 seconds.

```tsx
addToast({
  message: 'Cannot be manually dismissed',
  type: 'error',
  dismissible: false,
});
```

## Store Methods

### addToast

```tsx
const addToast = useLocationStore((state) => state.addToast);

addToast({
  message: string,
  type: 'error' | 'warning' | 'success' | 'info',
  dismissible?: boolean, // default: true
});
```

### removeToast

```tsx
const removeToast = useLocationStore((state) => state.removeToast);

removeToast(toastId);
```

### clearToasts

```tsx
const clearToasts = useLocationStore((state) => state.clearToasts);

clearToasts(); // Remove all toasts
```

## Common Error Messages

Use consistent message patterns for common errors:

```tsx
// API errors
showToast('Service temporarily unavailable', 'error');
showToast('Too many requests. Please wait a moment', 'error');

// Search errors
showToast('No results found for that address', 'warning');
showToast('Invalid address format', 'error');

// Analysis errors
showToast('Failed to fetch nearby facilities', 'error');
showToast('Failed to calculate distance', 'error');

// Network errors
showToast('Network error. Please check your connection', 'error');
```

## Styling

Toast styling uses Tailwind CSS with dark mode glassmorphism:

- Background: Semi-transparent with blur effect (`bg-*-900/80`)
- Border: Subtle colored border (`border-*-700`)
- Text: Light colored text (`text-*-200`)
- Animations: Fade-in and slide-in from top

## Accessibility

- ARIA `role="alert"` on each toast
- ARIA `aria-live="polite"` for screen reader announcements
- Keyboard-accessible close button with proper focus handling
- ARIA labels on all interactive elements

## Testing

Run tests with:

```bash
npm run test -- Toast.test.tsx
npm run test:watch -- Toast.test.tsx
```

The test suite covers:
- Rendering single and multiple toasts
- Type-specific styling
- Auto-dismiss behavior
- Manual dismissal
- Hook functionality
- Store integration

## Performance

- Toasts are rendered in a separate fixed container with `pointer-events-none`
- Only interactive elements have `pointer-events-auto`
- Timers are cleaned up on unmount to prevent memory leaks
- Uses CSS animations instead of JavaScript for transitions

## Limitations

- Max 500 characters per message (not enforced, but recommended for UX)
- Fixed 3-second auto-dismiss (not configurable per toast in current implementation)
- Top-right positioning only (not configurable)

## Future Enhancements

- Configurable auto-dismiss duration per toast
- Position configuration (top-left, bottom-right, etc.)
- Sound/vibration on notification
- Toast action buttons (undo, retry, etc.)
- Persistence across page navigation
