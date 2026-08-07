"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { IconButton } from "@/components/ui/IconButton";
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const groups = groupCategoriesByComposite(categories);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg outline-none"
      >
        <GlassPanel
          variant="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex flex-col max-h-[85vh]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 flex-shrink-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-100">
              {t("settings.title", { defaultValue: "Settings" })}
            </h2>
            <IconButton
              icon={X}
              label={t("settings.close", { defaultValue: "Close" })}
              onClick={onClose}
            />
          </div>

          <p className="px-4 pt-3 text-xs text-slate-400 flex-shrink-0">
            {t("settings.description", {
              defaultValue: "Facilities included in your location score, grouped by category.",
            })}
          </p>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" data-testid="settings-modal-body">
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
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

export default SettingsModal;
