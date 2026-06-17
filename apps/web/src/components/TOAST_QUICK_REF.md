# Toast Quick Reference

## Import & Use

```tsx
import { useToast } from '@/components/Toast';

const showToast = useToast();
showToast('Message text', 'error|warning|success|info');
```

## Examples

```tsx
// Error
showToast('Failed to analyze location', 'error');

// Warning
showToast('Radius exceeds 50km, may be slow', 'warning');

// Success
showToast('Location analyzed successfully', 'success');

// Info
showToast('Searching nearby facilities...', 'info');
```

## In React Query

```tsx
const { mutate } = useMutation({
  mutationFn: analyzeLocation,
  onError: () => showToast('Analysis failed', 'error'),
  onSuccess: () => showToast('Done!', 'success'),
});
```

## In try-catch

```tsx
try {
  await analyzeLocation(address);
  showToast('Success!', 'success');
} catch (error) {
  showToast('Failed', 'error');
}
```

## Store Direct Access

```tsx
import { useLocationStore } from '@/store';

const addToast = useLocationStore((state) => state.addToast);
addToast({ message: 'Text', type: 'error', dismissible: true });
```

## Props

- `message` (required): string, max ~500 chars
- `type` (required): `'error'` | `'warning'` | `'success'` | `'info'`
- `dismissible` (optional): boolean, default `true`

## Styling

| Type | Color | Use For |
|------|-------|---------|
| `error` | Red | Failed actions, errors |
| `warning` | Amber | Cautions, warnings |
| `success` | Green | Confirmations, success |
| `info` | Blue | Status, info messages |

## Features

- Auto-dismisses after 3 seconds
- Top-right corner positioning
- Dark mode glassmorphism
- Keyboard accessible
- Close button (unless `dismissible: false`)
- ARIA labels for screen readers
- Toast animations (fade-in, slide-in)

## Setup (Already Done)

- `Toast.tsx` — Component & hooks
- `Toast.test.tsx` — Tests
- `store/index.ts` — Extended with toast state
- `[locale]/layout.tsx` — Added `<ToastContainer />`

## Testing

```tsx
import { useLocationStore } from '@/store';

beforeEach(() => {
  useLocationStore.setState({ toasts: [] });
});

test('shows error toast', () => {
  // Trigger action
  expect(useLocationStore.getState().toasts).toHaveLength(1);
});
```

## Limitations

- Fixed 3-second dismiss duration (not per-toast configurable)
- Top-right position only (not configurable)
- No action buttons (not in MVP)
- No persist across navigation (not in MVP)
