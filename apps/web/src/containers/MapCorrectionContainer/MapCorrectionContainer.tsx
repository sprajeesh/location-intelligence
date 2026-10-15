"use client";

import { useLocationStore } from "@/store";
import { useCategories } from "@/hooks/useCategories";
import { useAddPlaceForm } from "@/hooks/useAddPlaceForm";
import { useRemovePlaceForm } from "@/hooks/useRemovePlaceForm";
import { AddPlaceForm, RemovePlaceForm } from "@/components/MapCorrectionForm";

/**
 * Shows the map correction form that matches the store's mode: add (from a map click) or
 * remove (from a facility popup). Renders nothing when no correction is in progress.
 */
export function MapCorrectionContainer() {
  const mode = useLocationStore((s) => s.correctionMode);
  const point = useLocationStore((s) => s.correctionPoint);
  const removeTarget = useLocationStore((s) => s.correctionRemoveTarget);
  const closeCorrection = useLocationStore((s) => s.closeCorrection);
  const { categories } = useCategories();

  if (mode === "adding" && point) {
    return (
      <AddPlaceContainer
        point={point}
        facilityTypes={categories.filter((c) => c.implemented)}
        onClose={closeCorrection}
      />
    );
  }

  if (mode === "removing" && removeTarget) {
    return (
      <RemovePlaceContainer
        targetOsmId={removeTarget.targetOsmId}
        targetName={removeTarget.name}
        onClose={closeCorrection}
      />
    );
  }

  return null;
}

interface AddPlaceContainerProps {
  point: { lat: number; lon: number };
  facilityTypes: { id: string; label: string }[];
  onClose: () => void;
}

function AddPlaceContainer({ point, facilityTypes, onClose }: AddPlaceContainerProps) {
  const form = useAddPlaceForm({ point });
  return (
    <AddPlaceForm
      facilityTypes={facilityTypes}
      values={form.values}
      errors={form.errors}
      formError={form.formError}
      sending={form.sending}
      onChange={form.setValue}
      onSubmit={form.submit}
      onClose={onClose}
    />
  );
}

interface RemovePlaceContainerProps {
  targetOsmId: string;
  targetName: string;
  onClose: () => void;
}

function RemovePlaceContainer({ targetOsmId, targetName, onClose }: RemovePlaceContainerProps) {
  const form = useRemovePlaceForm({ targetOsmId });
  return (
    <RemovePlaceForm
      targetName={targetName}
      reason={form.reason}
      website={form.website}
      reasonError={form.reasonError}
      serverError={form.serverError}
      sending={form.sending}
      onReasonChange={form.setReason}
      onWebsiteChange={form.setWebsite}
      onSubmit={form.submit}
      onClose={onClose}
    />
  );
}
