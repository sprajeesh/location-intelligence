"use client";

import { Map, BarChart3, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocationStore } from "@/store";
import { Button } from "@/components/ui/Button";

/**
 * MobileViewToggleContainer — the mobile-only "Map" / "Results" (or
 * "Route") button that lives in the bottom controls bar. Replaces what used
 * to be two separate, contextually-positioned buttons (an inline "Show map"
 * button next to the search bar, and a floating "View scores"/"Show route"
 * button over the map). Renders nothing until an address is selected, since
 * there's nothing to toggle between before then.
 */
export interface MobileViewToggleContainerProps {
  className?: string;
}

export function MobileViewToggleContainer({ className }: MobileViewToggleContainerProps = {}) {
  const { selectedAddress, isMapViewOnMobile, setIsMapViewOnMobile, isNavigating, activeRoute } =
    useLocationStore();
  const t = useTranslations();

  if (!selectedAddress) {
    return null;
  }

  if (isMapViewOnMobile) {
    const isRouteDisplayed = isNavigating && !!activeRoute && activeRoute.length >= 2;
    return (
      <Button
        icon={isRouteDisplayed ? Route : BarChart3}
        label={
          isRouteDisplayed
            ? t("map.showRoute", { defaultValue: "Route" })
            : t("map.viewScores", { defaultValue: "Results" })
        }
        title={
          isRouteDisplayed
            ? t("map.showRouteTooltip", { defaultValue: "Show route details" })
            : t("map.viewScoresTooltip", { defaultValue: "View scores" })
        }
        onClick={() => setIsMapViewOnMobile(false)}
        className={className}
      />
    );
  }

  return (
    <Button
      icon={Map}
      label={t("map.showMap", { defaultValue: "Map" })}
      title={t("map.showMapTooltip", { defaultValue: "Show map" })}
      onClick={() => setIsMapViewOnMobile(true)}
      className={className}
    />
  );
}

export default MobileViewToggleContainer;
