"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { SurfacePanel } from "@/components/ui/SurfacePanel";
import { ToolbarButton } from "@/components/ToolbarButton";
import { SettingsModal } from "@/components/SettingsModal";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryWeights } from "@/hooks/useCategoryWeights";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLocationStore } from "@/store";
import {
  computeDefaultWeightsForActiveCategories,
  getActiveCompositeCategories,
  getDefaultFacilityIds,
  isSameFacilitySet,
  resolveCategoriesForRequest,
  resolveCategoryWeightsForRequest,
} from "@/utils/facilitySelection";

function weightsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Math.abs((a[key] ?? 0) - (b[key] ?? 0)) < 0.005);
}

/**
 * SettingsContainer — the settings gear button at the top of the map toolbar stack,
 * plus the Settings modal it opens. Fetches all facility types up front so the
 * modal can render instantly once opened. Owns saving the user's facility
 * selection to the session store and, if an address is already analyzed,
 * confirming whether to re-run it with the updated selection.
 */
export function SettingsContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReanalyze, setPendingReanalyze] = useState(false);
  const { categories, isLoading, isError } = useCategories();
  const { categoryWeights: defaultCategoryWeights, isLoading: isWeightsLoading } = useCategoryWeights();
  const { mutate: analyze } = useAnalyze();
  const {
    selectedFacilities,
    setSelectedFacilities,
    categoryWeights,
    setCategoryWeights,
    selectedAddress,
    analysisResult,
    radiusKm,
    distanceMode,
  } = useLocationStore();
  const t = useTranslations();

  const handleClose = () => {
    setIsOpen(false);
    setPendingReanalyze(false);
  };

  const handleSave = (facilityIds: string[], newCategoryWeights: Record<string, number>) => {
    const defaultIds = getDefaultFacilityIds(categories);
    const previousIds = selectedFacilities ?? defaultIds;
    const facilitiesChanged = !isSameFacilitySet(facilityIds, previousIds);

    const activeForSaved = getActiveCompositeCategories(categories, facilityIds);
    const defaultWeightsForSaved = computeDefaultWeightsForActiveCategories(
      activeForSaved,
      defaultCategoryWeights,
    );
    const previousWeights =
      categoryWeights ??
      computeDefaultWeightsForActiveCategories(
        getActiveCompositeCategories(categories, previousIds),
        defaultCategoryWeights,
      );
    const weightsChanged = !weightsEqual(newCategoryWeights, previousWeights);
    const changed = facilitiesChanged || weightsChanged;

    setSelectedFacilities(isSameFacilitySet(facilityIds, defaultIds) ? null : facilityIds);
    setCategoryWeights(
      weightsEqual(newCategoryWeights, defaultWeightsForSaved) ? null : newCategoryWeights,
    );

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
        categoryWeights: resolveCategoryWeightsForRequest(categoryWeights),
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
      <SurfacePanel variant="toolbar" className="p-1 flex-shrink-0">
        <ToolbarButton
          icon={Settings}
          label={t("settings.tooltip", { defaultValue: "Settings" })}
          onClick={() => setIsOpen(true)}
        />
      </SurfacePanel>

      {isOpen &&
        createPortal(
          <SettingsModal
            categories={categories}
            isLoading={isLoading}
            isError={isError}
            selectedFacilities={selectedFacilities}
            categoryWeights={categoryWeights}
            defaultCategoryWeights={defaultCategoryWeights}
            isWeightsLoading={isWeightsLoading}
            pendingReanalyze={pendingReanalyze}
            address={selectedAddress?.displayName ?? null}
            onClose={handleClose}
            onSave={handleSave}
            onConfirmReanalyze={handleConfirmReanalyze}
            onDismissReanalyze={handleDismissReanalyze}
          />,
          document.body,
        )}
    </>
  );
}

export default SettingsContainer;
