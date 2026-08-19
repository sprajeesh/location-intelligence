"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { groupCategoriesByComposite } from "@/utils/groupCategories";
import { getDefaultFacilityIds, MAX_SELECTED_FACILITIES } from "@/utils/facilitySelection";
import type { Category } from "@/types/api";

export interface SettingsModalProps {
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  /** The committed selection from session storage; null means "use defaults". */
  selectedFacilities: string[] | null;
  /** True once Save has been clicked and re-analyzing the current address needs confirmation. */
  pendingReanalyze: boolean;
  address: string | null;
  onClose: () => void;
  onSave: (facilityIds: string[]) => void;
  onConfirmReanalyze: () => void;
  onDismissReanalyze: () => void;
}

/**
 * SettingsModal — lists every facility type from GET /categories, grouped by
 * composite category. Lets the user pick up to MAX_SELECTED_FACILITIES,
 * committed to the session on Save. If an address is already analyzed and
 * the selection changed, asks for confirmation before re-running it.
 */
export function SettingsModal({
  categories,
  isLoading,
  isError,
  selectedFacilities,
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
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Categories load asynchronously; seed the draft from the committed
  // selection (or the DB defaults) as soon as they're available.
  useEffect(() => {
    if (draft === null && categories.length > 0) {
      setDraft(selectedFacilities ?? getDefaultFacilityIds(categories));
    }
  }, [draft, categories, selectedFacilities]);

  const handleToggle = (facilityId: string, checked: boolean) => {
    setDraft((prev) => {
      if (prev === null) return prev;
      if (!checked) {
        setShowLimitWarning(false);
        return prev.filter((id) => id !== facilityId);
      }
      if (prev.length >= MAX_SELECTED_FACILITIES) {
        setShowLimitWarning(true);
        return prev;
      }
      setShowLimitWarning(false);
      return [...prev, facilityId];
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
              defaultValue: `Your facility selection has changed. Re-run the analysis for "${address}" with the updated facilities?`,
            })}
          </p>
        </ModalContent>
        <ModalFooter>
          <button
            type="button"
            onClick={onDismissReanalyze}
            className="px-3 py-1.5 rounded-lg font-medium text-sm text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white"
          >
            {t("settings.notNow", { defaultValue: "Not now" })}
          </button>
          <button
            type="button"
            onClick={onConfirmReanalyze}
            className="px-3 py-1.5 rounded-lg font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white"
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

      <p className="px-4 pt-3 text-xs text-slate-500 flex-shrink-0">
        {t("settings.description", {
          defaultValue: "Facilities included in your location score, grouped by category.",
        })}
      </p>
      <p className="px-4 pt-1 text-xs text-slate-500 flex-shrink-0">
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
          groups.map((group) => (
            <section key={group.compositeCategory}>
              <h3 className="text-sm font-medium text-slate-700 mb-1.5">
                {t(`score.categories.${group.compositeCategory}`, {
                  defaultValue: group.compositeCategory,
                })}
              </h3>
              <ul>
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
          ))}
      </ModalContent>

      <ModalFooter>
        <button
          type="button"
          onClick={() => draft !== null && onSave(draft)}
          disabled={draft === null}
          className="px-4 py-1.5 rounded-lg font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white"
        >
          {t("settings.save", { defaultValue: "Save" })}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default SettingsModal;
