"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocationStore } from "@/store";
import { Button } from "@/components/ui/Button";

export interface ThemeToggleProps {
  className?: string;
  /** Use the shorter "Dark"/"Light" label instead of "Dark mode"/"Light mode" — mobile only, where the bottom bar is tighter on space. */
  compact?: boolean;
}

export function ThemeToggle({
  className,
  compact = false,
}: ThemeToggleProps = {}) {
  const theme = useLocationStore((s) => s.theme);
  const toggleTheme = useLocationStore((s) => s.toggleTheme);
  const isDark = theme === "dark";
  const t = useTranslations();

  return (
    <Button
      icon={isDark ? Sun : Moon}
      label={
        isDark
          ? compact
            ? t("theme.lightShort", { defaultValue: "Light" })
            : t("theme.light", { defaultValue: "Light mode" })
          : compact
            ? t("theme.darkShort", { defaultValue: "Dark" })
            : t("theme.dark", { defaultValue: "Dark mode" })
      }
      title={
        isDark
          ? t("theme.switchToLight", { defaultValue: "Switch to light mode" })
          : t("theme.switchToDark", { defaultValue: "Switch to dark mode" })
      }
      pressed={isDark}
      onClick={toggleTheme}
      className={className}
    />
  );
}

export default ThemeToggle;
