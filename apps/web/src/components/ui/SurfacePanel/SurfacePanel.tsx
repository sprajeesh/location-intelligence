import type { ComponentPropsWithoutRef, ElementType, Ref } from "react";

export type SurfacePanelVariant = "panel" | "toolbar" | "sidebar" | "chip" | "popover";

export interface SurfacePanelProps extends ComponentPropsWithoutRef<"div"> {
  variant?: SurfacePanelVariant;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

// Exported so non-SurfacePanel elements that still need this exact surface
// recipe (e.g. an already-`<button>` from Button/IconButton, or another
// component's `className` prop) can compose it in directly instead of
// re-typing the literal classes.
export const SURFACE_PANEL_CLASSES: Record<SurfacePanelVariant, string> = {
  panel: "bg-white border border-slate-200 rounded-xl shadow-card",
  toolbar: "bg-white border border-slate-200 rounded-xl shadow-card-lg",
  sidebar: "bg-white border-slate-200 border-b md:border-b-0 md:border-r",
  // Small floating surfaces -- a stepper/adjuster popover, a toolbar chip.
  chip: "bg-white border border-slate-200 rounded-lg shadow-card",
  // Dropdown/menu surfaces -- deeper shadow than `chip`, same shape.
  popover: "bg-white border border-slate-200 rounded-lg shadow-popover",
};

export function SurfacePanel({ variant = "panel", as: Tag = "div", className = "", ref, ...rest }: SurfacePanelProps) {
  return <Tag ref={ref} {...rest} className={`${SURFACE_PANEL_CLASSES[variant]} ${className}`.trim()} />;
}

export default SurfacePanel;
