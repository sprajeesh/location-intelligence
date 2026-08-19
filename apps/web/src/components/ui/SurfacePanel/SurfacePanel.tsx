import type { ComponentPropsWithoutRef, ElementType, Ref } from "react";

export type SurfacePanelVariant = "panel" | "toolbar";

export interface SurfacePanelProps extends ComponentPropsWithoutRef<"div"> {
  variant?: SurfacePanelVariant;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

const VARIANT_CLASSES: Record<SurfacePanelVariant, string> = {
  panel: "bg-white border border-slate-200 rounded-xl shadow-card",
  toolbar: "bg-white border border-slate-200 rounded-xl shadow-card-lg",
};

export function SurfacePanel({ variant = "panel", as: Tag = "div", className = "", ref, ...rest }: SurfacePanelProps) {
  return <Tag ref={ref} {...rest} className={`${VARIANT_CLASSES[variant]} ${className}`.trim()} />;
}

export default SurfacePanel;
