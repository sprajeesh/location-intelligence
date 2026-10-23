"use client";

import { MobileViewToggleContainer } from "@/containers/MobileViewToggleContainer";
import { SURFACE_PANEL_CLASSES } from "@/components/ui/SurfacePanel";

export interface MobileControlsBarProps {
  className?: string;
}

/**
 * MobileControlsBar — the mobile-only row under the results holding just the
 * Map/Results toggle. Theme, Scoring, Report and the site links moved to
 * MobileMenu so this row stays out of the way of the core flow.
 */
export function MobileControlsBar({ className = "" }: MobileControlsBarProps) {
  return (
    <div
      className={`flex-shrink-0 border-t border-slate-200 px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center ${className}`}
    >
      <MobileViewToggleContainer className={`${SURFACE_PANEL_CLASSES.chip} w-full justify-center`} />
    </div>
  );
}

export default MobileControlsBar;
