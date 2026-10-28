/**
 * Shared layout for score row/card labels (category and facility type).
 * The header is the container (`@container`), and the label font scales
 * between 12px and 14px with its width so it stays on one line on narrow
 * screens. Full class names are kept literal so Tailwind detects them.
 */
export const FLUID_LABEL_CONTAINER_CLASS = "@container";
export const FLUID_LABEL_TEXT_CLASS =
  "min-w-0 truncate text-[length:clamp(0.75rem,5cqw,0.875rem)]";
