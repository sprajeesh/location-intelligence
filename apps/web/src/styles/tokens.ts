/**
 * Single source of truth for brand/semantic color hex values.
 *
 * tailwind.config.ts imports this directly, so Tailwind classes (bg-primary-500
 * etc.) are generated from these exact values. A handful of these shades are
 * also hand-mirrored as CSS custom properties in src/i18n/globals.css's :root
 * block, for the few places that render outside Tailwind's reach (Leaflet
 * divIcon HTML strings and GeoJSON/Polyline style callbacks in MapContainer.tsx,
 * which run in the browser and can't use compiled Tailwind classes). If a value
 * here changes, update that :root block to match.
 */

export const primary = {
  50: '#EFF5FF',
  100: '#DBE9FF',
  200: '#B8D2FF',
  300: '#8AB4FF',
  400: '#5389FF',
  500: '#0B5CFF',
  600: '#0044DB',
  700: '#0036AD',
  800: '#002C87',
  900: '#01256B',
  950: '#011642',
} as const;

export const success = {
  50: '#ECFDF3',
  100: '#D1FADF',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
} as const;

export const warning = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
} as const;

export const error = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
} as const;

// Zoom-style SaaS apps use one blue for both brand/CTA and "info" tone --
// aliased rather than hand-duplicated, so there's only one blue to tune.
export const info = primary;

// Deep-navy heading/high-contrast text color (not pure black), Zoom-style.
export const ink = '#00053D';
