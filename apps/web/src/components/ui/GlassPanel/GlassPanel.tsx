import type { ComponentPropsWithoutRef, ElementType } from "react";

export type GlassPanelVariant = "panel" | "toolbar";

export interface GlassPanelProps extends ComponentPropsWithoutRef<"div"> {
  variant?: GlassPanelVariant;
  as?: ElementType;
}

const VARIANT_CLASSES: Record<GlassPanelVariant, string> = {
  panel: "bg-slate-900/90 backdrop-blur border border-slate-700/60 rounded-lg shadow-2xl",
  toolbar: "bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl",
};

export function GlassPanel({ variant = "panel", as: Tag = "div", className = "", ...rest }: GlassPanelProps) {
  return <Tag {...rest} className={`${VARIANT_CLASSES[variant]} ${className}`.trim()} />;
}

export default GlassPanel;
