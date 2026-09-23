"use client";

import { useTranslations } from "next-intl";
import type { RouteTransportMode } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ROUTE_MODES } from "./routeModes";

export interface RouteModesSelectorProps {
  activeMode: RouteTransportMode | null;
  onModeChange: (mode: RouteTransportMode) => void;
  variant?: "full" | "icon";
}

export function RouteModeSelector({
  activeMode,
  onModeChange,
  variant = "full",
}: RouteModesSelectorProps) {
  const t = useTranslations("navigate");
  const isIconOnly = variant === "icon";

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Transport mode">
      {ROUTE_MODES.map(({ mode, labelKey, icon }) => {
        const label = t(labelKey);
        const isActive = activeMode === mode;

        return isIconOnly ? (
          <IconButton
            key={mode}
            icon={icon}
            label={label}
            size="sm"
            active={isActive}
            activeVariant="solid"
            pressed={isActive}
            onClick={() => onModeChange(mode)}
          />
        ) : (
          <Button
            key={mode}
            icon={icon}
            label={label}
            labelClassName="hidden sm:inline"
            active={isActive}
            activeVariant="solid"
            pressed={isActive}
            onClick={() => onModeChange(mode)}
          />
        );
      })}
    </div>
  );
}

export default RouteModeSelector;
