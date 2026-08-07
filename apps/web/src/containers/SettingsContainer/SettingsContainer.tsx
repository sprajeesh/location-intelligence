"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ToolbarButton } from "@/components/ToolbarButton";
import { SettingsModal } from "@/components/SettingsModal";
import { useCategories } from "@/hooks/useCategories";

/**
 * SettingsContainer — the gear button next to the address search box, plus
 * the Settings modal it opens. Fetches all facility types up front so the
 * modal can render instantly once opened.
 */
export function SettingsContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const { categories, isLoading, isError } = useCategories();
  const t = useTranslations();

  return (
    <>
      <GlassPanel variant="toolbar" className="p-1 flex-shrink-0">
        <ToolbarButton
          icon={Settings}
          label={t("settings.tooltip", { defaultValue: "Settings" })}
          onClick={() => setIsOpen(true)}
        />
      </GlassPanel>

      {isOpen && (
        <SettingsModal
          categories={categories}
          isLoading={isLoading}
          isError={isError}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default SettingsContainer;
