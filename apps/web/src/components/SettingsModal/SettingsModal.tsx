"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { WeightSlider } from "@/components/ui/WeightSlider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { groupCategoriesByComposite } from "@/utils/groupCategories";
import {
  computeDefaultWeightsForActiveCategories,
  getActiveCompositeCategories,
  getDefaultFacilityIds,
  MAX_SELECTED_FACILITIES,
  weightToPercent,
} from "@/utils/facilitySelection";
import type { Category } from "@/types/api";

const WEIGHT_SUM_TOLERANCE = 0.005;

export interface SettingsModalProps {
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  /** The committed selection from session storage; null means "use defaults". */
  selectedFacilities: string[] | null;
  /** The committed weight configuration; null means "use DB defaults". */
  categoryWeights: Record<string, number> | null;
  /** DB-configured default weight ratios, used to seed newly-active categories. */
  defaultCategoryWeights: Record<string, number>;
  /** True while GET /category-weights (defaultCategoryWeights) is still in flight. */
  isWeightsLoading: boolean;
  /** True once Save has been clicked and re-analyzing the current address needs confirmation. */
  pendingReanalyze: boolean;
  address: string | null;
  onClose: () => void;
  onSave: (
    facilityIds: string[],
    categoryWeights: Record<string, number>,
    weightsTouched: boolean,
  ) => void;
  onConfirmReanalyze: () => void;
  onDismissReanalyze: () => void;
}

/**
 * SettingsModal — lists every facility type from GET /categories, grouped by
 * composite category, with an inline weight slider in each category's
 * header. Each slider is independent -- Save is disabled until the active
 * categories' weights add up to exactly 100%.
 */
export function SettingsModal({
  categories,
  isLoading,
  isError,
  selectedFacilities,
  categoryWeights,
  defaultCategoryWeights,
  isWeightsLoading,
  pendingReanalyze,
  address,
  onClose,
  onSave,
  onConfirmReanalyze,
  onDismissReanalyze,
}: SettingsModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const groups = groupCategoriesByComposite(categories);

  const [draft, setDraft] = useState<string[] | null>(null);
  const [weightDraft, setWeightDraft] = useState<Record<string, number> | null>(null);
  // True once the user has directly edited a weight slider/input this
  // session, or the modal opened with already-customized weights. Used
  // instead of diffing weightDraft against a freshly computed default,
  // since a deliberate value (e.g. an even 50/50 split) can coincidentally
  // equal that default -- see onSave in SettingsContainer.
  const [weightsTouched, setWeightsTouched] = useState(categoryWeights !== null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  // Set by handleToggle when a facility toggle changes the active-category
  // set while defaultCategoryWeights is still loading -- recomputing right
  // then would bake in the still-empty `{}`. Holds the active set to
  // recompute against once loading settles.
  const [pendingWeightsReset, setPendingWeightsReset] = useState<string[] | null>(null);

  // Categories load asynchronously; seed the draft from the committed
  // selection (or the DB defaults) as soon as they're available.
  useEffect(() => {
    if (draft === null && categories.length > 0) {
      setDraft(selectedFacilities ?? getDefaultFacilityIds(categories));
    }
  }, [draft, categories, selectedFacilities]);

  // Weight seeding needs defaultCategoryWeights, which is a separate query
  // (GET /category-weights) from `categories` -- wait for it to settle so a
  // still-loading `{}` doesn't get baked into the weights (and then never
  // corrected, since this only runs while weightDraft is null). A pending
  // toggle-driven reset (see handleToggle) takes priority over the initial
  // categoryWeights-or-computed-defaults seed, since it reflects the user's
  // latest facility selection rather than what was true when the modal
  // opened. On failure defaultCategoryWeights stays `{}`, which
  // computeDefaultWeightsForActiveCategories already handles by splitting
  // evenly across the active categories.
  useEffect(() => {
    if (weightDraft !== null || draft === null || isWeightsLoading) return;

    if (pendingWeightsReset !== null) {
      setWeightDraft(computeDefaultWeightsForActiveCategories(pendingWeightsReset, defaultCategoryWeights));
      setPendingWeightsReset(null);
      return;
    }

    const active = getActiveCompositeCategories(categories, draft);
    setWeightDraft(
      categoryWeights ?? computeDefaultWeightsForActiveCategories(active, defaultCategoryWeights),
    );
  }, [
    weightDraft,
    draft,
    categories,
    categoryWeights,
    defaultCategoryWeights,
    isWeightsLoading,
    pendingWeightsReset,
  ]);

  const activeCategories =
    draft === null ? [] : getActiveCompositeCategories(categories, draft);
  const total = activeCategories.reduce((sum, category) => sum + (weightDraft?.[category] ?? 0), 0);
  const totalPercent = weightToPercent(total);
  const totalIsValid = Math.abs(total - 1) < WEIGHT_SUM_TOLERANCE;
  const hasZeroWeightCategory = activeCategories.some(
    (category) => (weightDraft?.[category] ?? 0) <= 0,
  );
  const weightsAreValid = activeCategories.length === 0 || (totalIsValid && !hasZeroWeightCategory);

  const handleToggle = (facilityId: string, checked: boolean) => {
    setDraft((prev) => {
      if (prev === null) return prev;
      let next: string[];
      if (!checked) {
        setShowLimitWarning(false);
        next = prev.filter((id) => id !== facilityId);
      } else if (prev.length >= MAX_SELECTED_FACILITIES) {
        setShowLimitWarning(true);
        return prev;
      } else {
        setShowLimitWarning(false);
        next = [...prev, facilityId];
      }

      const prevActive = getActiveCompositeCategories(categories, prev);
      const nextActive = getActiveCompositeCategories(categories, next);
      if (nextActive.length !== prevActive.length || !nextActive.every((c) => prevActive.includes(c))) {
        // The active category set changed, so weightDraft is about to be
        // reseeded to a fresh computed default -- not a user edit, so any
        // prior customization no longer applies.
        setWeightsTouched(false);
        if (isWeightsLoading) {
          // defaultCategoryWeights isn't ready yet -- clear weightDraft and
          // defer the recompute to the seeding effect once loading settles,
          // rather than baking in the still-empty `{}`.
          setWeightDraft(null);
          setPendingWeightsReset(nextActive);
        } else {
          setPendingWeightsReset(null);
          setWeightDraft(computeDefaultWeightsForActiveCategories(nextActive, defaultCategoryWeights));
        }
      }

      return next;
    });
  };

  if (pendingReanalyze) {
    return (
      <Modal onClose={onDismissReanalyze} aria-labelledby={titleId}>
        <ModalHeader
          titleId={titleId}
          title={t("settings.title", { defaultValue: "Settings" })}
          onClose={onDismissReanalyze}
          closeLabel={t("settings.close", { defaultValue: "Close" })}
        />
        <ModalContent>
          <p className="text-sm text-slate-700">
            {t("settings.confirmReanalyzeMessage", {
              address: address ?? "",
              defaultValue: `Your facility selection or category weightings have changed. Re-run the analysis for "${address}" with the updated settings?`,
            })}
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="ghost"
            label={t("settings.notNow", { defaultValue: "Not now" })}
            onClick={onDismissReanalyze}
          />
          <Button
            variant="primary"
            label={t("settings.reanalyze", { defaultValue: "Re-analyze" })}
            onClick={onConfirmReanalyze}
          />
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} aria-labelledby={titleId}>
      <ModalHeader
        titleId={titleId}
        title={t("settings.title", { defaultValue: "Settings" })}
        onClose={onClose}
        closeLabel={t("settings.close", { defaultValue: "Close" })}
      />

      <p className="px-4 pt-2 text-xs text-slate-500 flex-shrink-0">
        {t("settings.description", {
          defaultValue: "Facilities included in your location score, grouped by category.",
        })}
      </p>
      <p className="px-4 pt-0.5 text-xs text-slate-500 flex-shrink-0">
        {t("settings.helpMaxFacilities", {
          max: MAX_SELECTED_FACILITIES,
          defaultValue: `Choose up to ${MAX_SELECTED_FACILITIES} facilities. Unselect one to choose a different one.`,
        })}
      </p>

      <ModalContent data-testid="settings-modal-body">
        {isLoading && (
          <p className="text-sm text-slate-500">
            {t("settings.loading", { defaultValue: "Loading facilities..." })}
          </p>
        )}

        {isError && (
          <p className="text-sm text-error-600">
            {t("settings.error", { defaultValue: "Couldn't load facility settings." })}
          </p>
        )}

        {showLimitWarning && (
          <p role="alert" className="text-xs text-warning-600">
            {t("settings.limitReached", {
              max: MAX_SELECTED_FACILITIES,
              defaultValue: `You've reached the maximum of ${MAX_SELECTED_FACILITIES} facilities. Unselect one first to choose another.`,
            })}
          </p>
        )}

        {!isLoading &&
          !isError &&
          draft !== null &&
          groups.map((group) => {
            const isActive = activeCategories.includes(group.compositeCategory);
            const label = t(`score.categories.${group.compositeCategory}`, {
              defaultValue: group.compositeCategory,
            });
            const weight = isActive ? (weightDraft?.[group.compositeCategory] ?? 0) : 0;
            const percent = weightToPercent(weight);

            return (
              <section key={group.compositeCategory}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">{label}</h3>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.01}
                      value={percent}
                      disabled={!isActive || weightDraft === null}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        const clamped = Number.isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
                        setWeightsTouched(true);
                        setWeightDraft((prev) => ({
                          ...(prev ?? {}),
                          [group.compositeCategory]: clamped / 100,
                        }));
                      }}
                      aria-label={t("settings.weights.percentInputLabel", {
                        category: label,
                        defaultValue: `${label} weight percent`,
                      })}
                      size="sm"
                      align="right"
                      className={`w-14 px-1.5 tabular-nums font-medium ${
                        isActive ? "!text-slate-700" : "!text-slate-300"
                      }`}
                    />
                    <span className={`text-xs font-medium ${isActive ? "text-slate-500" : "text-slate-300"}`}>
                      %
                    </span>
                  </div>
                </div>
                <WeightSlider
                  label={label}
                  value={weight}
                  disabled={!isActive || weightDraft === null}
                  onChange={(next) => {
                    setWeightsTouched(true);
                    setWeightDraft((prev) => ({ ...(prev ?? {}), [group.compositeCategory]: next }));
                  }}
                />
                <ul className="mt-1">
                  {group.facilities.map((facility) => (
                    <li key={facility.id}>
                      <Checkbox
                        id={`settings-facility-${facility.id}`}
                        checked={draft.includes(facility.id)}
                        label={facility.label}
                        color={facility.color}
                        onChange={(checked) => handleToggle(facility.id, checked)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
      </ModalContent>

      <ModalFooter>
        {weightDraft !== null && activeCategories.length > 0 && (
          <div className="mr-auto">
            <p
              className={`text-xs font-medium ${
                weightsAreValid ? "text-success-600" : totalIsValid ? "text-warning-600" : "text-error-600"
              }`}
            >
              {t("settings.weights.footerTotal", {
                total: totalPercent,
                defaultValue: `Total Weightage: ${totalPercent}%`,
              })}
              {weightsAreValid ? " ✓" : ""}
            </p>
            {!weightsAreValid && (
              <p className="text-xs text-slate-500">
                {!totalIsValid
                  ? t("settings.weights.helpNotHundred", {
                      defaultValue: "Adjust weights so they total 100% to save.",
                    })
                  : t("settings.weights.helpZeroWeight", {
                      defaultValue: "Every selected category needs a weight greater than 0% to save.",
                    })}
              </p>
            )}
          </div>
        )}
        <Button
          variant="primary"
          label={t("settings.save", { defaultValue: "Save" })}
          onClick={() => {
            if (draft === null || weightDraft === null || !weightsAreValid) return;

            const activeOnlyWeights = Object.fromEntries(
              activeCategories.map((category) => [category, weightDraft[category] ?? 0]),
            );
            onSave(draft, activeOnlyWeights, weightsTouched);
          }}
          disabled={draft === null || weightDraft === null || !weightsAreValid}
        />
      </ModalFooter>
    </Modal>
  );
}

export default SettingsModal;
