import type { ReactNode } from "react";
import { InlineBanner, type InlineBannerTone } from "@/components/ui/InlineBanner";

export interface MapNoticeProps {
  tone: InlineBannerTone;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Floating notice pinned to the top-centre of the map. Non-interactive
 * (`pointer-events-none`) and absolutely positioned, so it doesn't pan or zoom
 * with the map.
 */
export function MapNotice({ tone, icon, children }: MapNoticeProps) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <InlineBanner tone={tone} icon={icon}>
        {children}
      </InlineBanner>
    </div>
  );
}

export default MapNotice;
