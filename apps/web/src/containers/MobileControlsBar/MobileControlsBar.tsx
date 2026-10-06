"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportButton } from "@/components/ReportButton";
import { SettingsContainer } from "@/containers/SettingsContainer";
import { MobileViewToggleContainer } from "@/containers/MobileViewToggleContainer";
import { SURFACE_PANEL_CLASSES, CHIP_BORDER_SHADOW } from "@/components/ui/SurfacePanel";

export interface MobileControlsBarProps {
  report: {
    generating: boolean;
    ready: boolean;
    disabled: boolean;
    onClick: () => void;
  };
  /** Hide the Report button, e.g. before an address is selected. */
  showReport?: boolean;
  className?: string;
}

/**
 * MobileControlsBar — the mobile-only row of Theme, Scoring, Map/Results
 * toggle and Report buttons. Shared by HomeContainer (initial and map views)
 * and ResultsPanel (results view) so both stay identical.
 */
export function MobileControlsBar({
  report,
  showReport = true,
  className = "",
}: MobileControlsBarProps) {
  return (
    <div
      className={`flex-shrink-0 border-t border-slate-200 px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1 ${className}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <ThemeToggle compact iconOnlyOnNarrow className={SURFACE_PANEL_CLASSES.chip} />
        <SettingsContainer iconOnlyOnNarrow className={SURFACE_PANEL_CLASSES.chip} />
        <MobileViewToggleContainer iconOnlyOnNarrow className={SURFACE_PANEL_CLASSES.chip} />
      </div>
      {showReport && (
        <ReportButton
          generating={report.generating}
          ready={report.ready}
          disabled={report.disabled}
          onClick={report.onClick}
          fullWidth={false}
          className={CHIP_BORDER_SHADOW}
        />
      )}
    </div>
  );
}

export default MobileControlsBar;
