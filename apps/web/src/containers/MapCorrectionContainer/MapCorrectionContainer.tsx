"use client";

import { useLocationStore } from "@/store";
import { useCategories } from "@/hooks/useCategories";
import { useAddPlaceForm } from "@/hooks/useAddPlaceForm";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
import { useRemovePlaceForm } from "@/hooks/useRemovePlaceForm";
import { AddPlaceForm, RemovePlaceForm } from "@/components/MapCorrectionForm";
import type { MapCorrectionRemoveTarget } from "@/types/api";

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
      <RemovePlaceContainer target={removeTarget} onClose={closeCorrection} />
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
  const address = useAddressAutocomplete({
    value: form.values.address,
    onChange: (value) => form.setValue("address", value),
  });
  return (
    <AddPlaceForm
      facilityTypes={facilityTypes}
      values={form.values}
      errors={form.errors}
      formError={form.formError}
      sending={form.sending}
      canSubmit={form.canSubmit}
      address={{
        isOpen: address.isOpen,
        status: address.status,
        items: address.suggestions.map((suggestion, index) => ({
          key: `${suggestion.lat}-${suggestion.lon}-${index}`,
          id: `mc-address-option-${index}`,
          displayName: suggestion.displayName,
        })),
        highlightedIndex: address.highlightedIndex,
        onChange: address.onChange,
        onKeyDown: address.onKeyDown,
        onBlur: address.onBlur,
        onHighlight: address.onHighlight,
        onSelect: address.onSelect,
      }}
      onChange={form.setValue}
      onSubmit={form.submit}
      onClose={onClose}
    />
  );
}

interface RemovePlaceContainerProps {
  target: MapCorrectionRemoveTarget;
  onClose: () => void;
}

function RemovePlaceContainer({ target, onClose }: RemovePlaceContainerProps) {
  const form = useRemovePlaceForm({ target });
  return (
    <RemovePlaceForm
      targetName={target.name}
      reason={form.reason}
      website={form.website}
      reasonError={form.reasonError}
      serverError={form.serverError}
      sending={form.sending}
      canSubmit={form.canSubmit}
      onReasonChange={form.setReason}
      onWebsiteChange={form.setWebsite}
      onSubmit={form.submit}
      onClose={onClose}
    />
  );
}
