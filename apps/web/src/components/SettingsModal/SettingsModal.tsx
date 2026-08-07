"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalContent } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { groupCategoriesByComposite } from "@/utils/groupCategories";
import type { Category } from "@/types/api";

export interface SettingsModalProps {
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
}

/**
 * SettingsModal — lists every facility type from GET /categories, grouped by
 * composite category, with the DB-configured defaults ticked. Read-only for
 * now: nothing here is wired into /location/analyze yet.
 */
export function SettingsModal({ categories, isLoading, isError, onClose }: SettingsModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const groups = groupCategoriesByComposite(categories);

  return (
    <Modal onClose={onClose} aria-labelledby={titleId}>
      <ModalHeader
        titleId={titleId}
        title={t("settings.title", { defaultValue: "Settings" })}
        onClose={onClose}
        closeLabel={t("settings.close", { defaultValue: "Close" })}
      />

      <p className="px-4 pt-3 text-xs text-slate-400 flex-shrink-0">
        {t("settings.description", {
          defaultValue: "Facilities included in your location score, grouped by category.",
        })}
      </p>

      <ModalContent data-testid="settings-modal-body">
        {isLoading && (
          <p className="text-sm text-slate-400">
            {t("settings.loading", { defaultValue: "Loading facilities..." })}
          </p>
        )}

        {isError && (
          <p className="text-sm text-red-400">
            {t("settings.error", { defaultValue: "Couldn't load facility settings." })}
          </p>
        )}

        {!isLoading &&
          !isError &&
          groups.map((group) => (
            <section key={group.compositeCategory}>
              <h3 className="text-sm font-medium text-slate-300 mb-1.5">
                {t(`score.categories.${group.compositeCategory}`, {
                  defaultValue: group.compositeCategory,
                })}
              </h3>
              <ul>
                {group.facilities.map((facility) => (
                  <li key={facility.id}>
                    <Checkbox
                      id={`settings-facility-${facility.id}`}
                      checked={facility.isDefault}
                      label={facility.label}
                      color={facility.color}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </ModalContent>
    </Modal>
  );
}

export default SettingsModal;
