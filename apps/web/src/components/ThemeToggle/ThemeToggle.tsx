"use client";

import { Moon, Sun } from "lucide-react";
import { useLocationStore } from "@/store";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import { IconButton } from "@/components/ui/IconButton";

export function ThemeToggle() {
  const theme = useLocationStore((s) => s.theme);
  const toggleTheme = useLocationStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <SurfacePanel
      variant="toolbar"
      className="p-1"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <IconButton
        icon={isDark ? Sun : Moon}
        label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        pressed={isDark}
        onClick={toggleTheme}
      />
    </SurfacePanel>
  );
}

export default ThemeToggle;
