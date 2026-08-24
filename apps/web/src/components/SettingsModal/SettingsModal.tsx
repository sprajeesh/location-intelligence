"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { WeightSlider } from "@/components/ui/WeightSlider";
import { groupCategoriesByComposite } from "@/utils/groupCategories";
import {
  getActiveCompositeCategories,
  getDefaultFacilityIds,
  computeDefaultWeightsForActiveCategories,
  redistributeOnActivate,
  redistributeOnDeactivate,
  redistributeOnSliderChange,
  roundWeightsForDisplay,
  MAX_SELECTED_FACILITIES,
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
  /** True once Save has been clicked and re-analyzing the current address needs confirmation. */
  pendingReanalyze: boolean;
  address: string | null;
  onClose: () => void;
  onSave: (facilityIds: string[], categoryWeights: Record<string, number>) => void;
  onConfirmReanalyze: () => void;
  onDismissReanalyze: () => void;
}

/**
 * SettingsModal — lists every facility type from GET /categories, grouped by
 * composite category, with an inline weight slider in each category's
 * header. Sliders auto-balance (see facilitySelection.ts's redistribute*
 * helpers) so the total is always pinned at 100% as the user drags one or
 * toggles a facility, rather than requiring manual rebalancing.
 */
export function SettingsModal({
  categories,
  isLoading,
  isError,
  selectedFacilities,
  categoryWeights,
  defaultCategoryWeights,
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
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  // Categories load asynchronously; seed the draft from the committed
  // selection (or the DB defaults) as soon as they're available.
  useEffect(() => {
    if (draft === null && categories.length > 0) {
      const seededFacilities = selectedFacilities ?? getDefaultFacilityIds(categories);
      setDraft(seededFacilities);
      if (weightDraft === null) {
        const active = getActiveCompositeCategories(categories, seededFacilities);
        setWeightDraft(
          categoryWeights ??
            computeDefaultWeightsForActiveCategories(active, defaultCategoryWeights),
        );
      }
    }
  }, [draft, weightDraft, categories, selectedFacilities, categoryWeights, defaultCategoryWeights]);

  const activeCategories =
    draft === null ? [] : getActiveCompositeCategories(categories, draft);
  const displayWeights = roundWeightsForDisplay(weightDraft ?? {});
  const total = activeCategories.reduce((sum, category) => sum + (weightDraft?.[category] ?? 0), 0);
  const totalPercent = Math.round(total * 100);

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
      const added = nextActive.find((category) => !prevActive.includes(category));
      const removed = prevActive.find((category) => !nextActive.includes(category));

      if (added) {
        setWeightError(null);
        setWeightDraft((prevWeights) =>
          redistributeOnActivate(prevWeights ?? {}, added, defaultCategoryWeights),
        );
      } else if (removed) {
        setWeightError(null);
        setWeightDraft((prevWeights) => redistributeOnDeactivate(prevWeights ?? {}, removed));
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
          <button
            type="button"
            onClick={onDismissReanalyze}
            className="px-3 py-1.5 rounded-lg font-medium text-sm text-slate-600 hover:text-slate-900 transition-colors active:bg-slate-100 active:scale-[0.98]"
          >
            {t("settings.notNow", { defaultValue: "Not now" })}
          </button>
          <button
            type="button"
            onClick={onConfirmReanalyze}
            className="px-3 py-1.5 rounded-lg font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors active:bg-primary-800 active:scale-[0.98]"
          >
            {t("settings.reanalyze", { defaultValue: "Re-analyze" })}
          </button>
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

        {weightError && (
          <p role="alert" className="text-xs text-error-600">
            {weightError}
          </p>
        )}

        {!isLoading &&
          !isError &&
          draft !== null &&
          weightDraft !== null &&
          groups.map((group) => {
            const isActive = activeCategories.includes(group.compositeCategory);
            const label = t(`score.categories.${group.compositeCategory}`, {
              defaultValue: group.compositeCategory,
            });
            const percent = isActive ? (displayWeights[group.compositeCategory] ?? 0) : 0;

            return (
              <section key={group.compositeCategory}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">{label}</h3>
                  <span
                    className={`text-xs tabular-nums font-medium ${isActive ? "text-slate-500" : "text-slate-300"}`}
                  >
                    {percent}%
                  </span>
                </div>
                <WeightSlider
                  label={label}
                  value={percent}
                  disabled={!isActive || activeCategories.length <= 1}
                  onChange={(next) => {
                    setWeightError(null);
                    setWeightDraft((prev) =>
                      redistributeOnSliderChange(prev ?? {}, group.compositeCategory, next),
                    );
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
        {activeCategories.length > 0 && (
          <p
            className={`mr-auto text-xs font-medium ${
              Math.abs(total - 1) < WEIGHT_SUM_TOLERANCE
                ? "text-success-600"
                : total < 1
                  ? "text-warning-600"
                  : "text-error-600"
            }`}
          >
            {t("settings.weights.footerTotal", {
              total: totalPercent,
              defaultValue: `Total Weightage: ${totalPercent}%`,
            })}
            {Math.abs(total - 1) < WEIGHT_SUM_TOLERANCE ? " ✓" : ""}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (draft === null || weightDraft === null) return;

            const active = getActiveCompositeCategories(categories, draft);
            const activeTotal = active.reduce(
              (sum, category) => sum + (weightDraft[category] ?? 0),
              0,
            );
            if (active.length > 0 && Math.abs(activeTotal - 1) > WEIGHT_SUM_TOLERANCE) {
              const activeTotalPercent = Math.round(activeTotal * 100);
              setWeightError(
                t("settings.weights.mustSumTo100", {
                  total: activeTotalPercent,
                  defaultValue: `Category weights must add up to 100% (currently ${activeTotalPercent}%).`,
                }),
              );
              return;
            }

            const activeOnlyWeights = Object.fromEntries(
              active.map((category) => [category, weightDraft[category] ?? 0]),
            );
            onSave(draft, activeOnlyWeights);
          }}
          disabled={draft === null || weightDraft === null}
          className="px-4 py-1.5 rounded-lg font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-primary-800 active:scale-[0.98]"
        >
          {t("settings.save", { defaultValue: "Save" })}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default SettingsModal;
