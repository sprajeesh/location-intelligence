"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import L from "leaflet";
import { Button } from "@/components/ui/Button";
import { InlineBanner } from "@/components/ui/InlineBanner";
import { SurfacePanel } from "@/components/ui/SurfacePanel";

export interface CorrectionPlacementHintProps {
  onUseMapCentre: () => void;
  onCancel: () => void;
}

/**
 * Floating prompt shown while placing a missing place. "Use map centre" is the keyboard
 * route to a location; the map click is the pointer route.
 *
 * Rendered inside the Leaflet container. Leaflet's disableClickPropagation keeps presses
 * on the hint from starting a map drag, and marks its clicks so the map's click handler
 * ignores them (React's onClick still fires).
 */
export function CorrectionPlacementHint({ onUseMapCentre, onCancel }: CorrectionPlacementHintProps) {
  const t = useTranslations("mapCorrection.place");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute top-3 max-md:top-20 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-1.5rem)] max-w-md"
    >
      <SurfacePanel variant="toolbar" className="flex flex-col gap-2 p-3">
        <InlineBanner tone="neutral">{t("hint")}</InlineBanner>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="secondary" label={t("useCentre")} onClick={onUseMapCentre} />
          <Button type="button" variant="outline" label={t("cancel")} onClick={onCancel} />
        </div>
      </SurfacePanel>
    </div>
  );
}

export default CorrectionPlacementHint;
