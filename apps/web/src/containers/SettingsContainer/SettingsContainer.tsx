"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ToolbarButton } from "@/components/ToolbarButton";
import { SettingsModal } from "@/components/SettingsModal";
import { useCategories } from "@/hooks/useCategories";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLocationStore } from "@/store";
import {
  getDefaultFacilityIds,
  isSameFacilitySet,
  resolveCategoriesForRequest,
} from "@/utils/facilitySelection";

/**
 * SettingsContainer — the gear button next to the address search box, plus
 * the Settings modal it opens. Fetches all facility types up front so the
 * modal can render instantly once opened. Owns saving the user's facility
 * selection to the session store and, if an address is already analyzed,
 * confirming whether to re-run it with the updated selection.
 */
export function SettingsContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReanalyze, setPendingReanalyze] = useState(false);
  const { categories, isLoading, isError } = useCategories();
  const { mutate: analyze } = useAnalyze();
  const { selectedFacilities, setSelectedFacilities, selectedAddress, analysisResult, radiusKm, distanceMode } =
    useLocationStore();
  const t = useTranslations();

  const handleClose = () => {
    setIsOpen(false);
    setPendingReanalyze(false);
  };

  const handleSave = (facilityIds: string[]) => {
    const defaultIds = getDefaultFacilityIds(categories);
    const previousIds = selectedFacilities ?? defaultIds;
    const changed = !isSameFacilitySet(facilityIds, previousIds);

    setSelectedFacilities(isSameFacilitySet(facilityIds, defaultIds) ? null : facilityIds);

    if (changed && selectedAddress && analysisResult) {
      setPendingReanalyze(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleConfirmReanalyze = () => {
    if (selectedAddress) {
      analyze({
        address: selectedAddress.displayName,
        lat: selectedAddress.lat,
        lon: selectedAddress.lon,
        radiusKm,
        distanceMode,
        categories: resolveCategoriesForRequest(categories, selectedFacilities),
      });
    }
    setIsOpen(false);
    setPendingReanalyze(false);
  };

  const handleDismissReanalyze = () => {
    setIsOpen(false);
    setPendingReanalyze(false);
  };

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
          selectedFacilities={selectedFacilities}
          pendingReanalyze={pendingReanalyze}
          address={selectedAddress?.displayName ?? null}
          onClose={handleClose}
          onSave={handleSave}
          onConfirmReanalyze={handleConfirmReanalyze}
          onDismissReanalyze={handleDismissReanalyze}
        />
      )}
    </>
  );
}

export default SettingsContainer;
