"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Check, X as XIcon, HelpCircle as UnknownIcon } from "lucide-react";
import { Modal, ModalHeader, ModalContent } from "@/components/ui/Modal";
import { formatScoreValue, getScoreColorClass } from "@/utils/scoreDisplay";
import type { ExplainItem } from "@/utils/scoreDisplay";

/**
 * ScoreExplainModal — the "?" icon's destination for both the overall score
 * and each category. Renders two always-visible sections built entirely from
 * the API's own criteria/contribution data (see scoreDisplay.ts's
 * buildCategoryExplainItems/buildOverallExplainItems) -- no scoring rule is
 * ever hardcoded here, this only presents numbers/text the backend computed.
 */

export interface ScoreExplainModalProps {
  title: string;
  score: number | null;
  items: ExplainItem[];
  /** Which score.<namespace>.<item.key> i18n bucket to translate each row's label from. */
  itemNamespace: "categories" | "facilityTypes";
  onClose: () => void;
}

function CriterionIcon({ satisfied }: { satisfied: boolean | null }) {
  if (satisfied === null) {
    return <UnknownIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />;
  }
  return satisfied ? (
    <Check className="w-3.5 h-3.5 text-success-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
  ) : (
    <XIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
  );
}

export function ScoreExplainModal({
  title,
  score,
  items,
  itemNamespace,
  onClose,
}: ScoreExplainModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const notAssessedLabel = t("score.status.notAssessed", { defaultValue: "Not assessed" });

  return (
    <Modal onClose={onClose} aria-labelledby={titleId} data-testid="score-explain-modal">
      <ModalHeader
        titleId={titleId}
        title={title}
        onClose={onClose}
        closeLabel={t("score.explain.close", { defaultValue: "Close" })}
      />
      <ModalContent>
        <p className={`text-sm font-semibold ${getScoreColorClass(score)}`}>
          {score !== null ? `${formatScoreValue(score)}/100` : notAssessedLabel}
        </p>

        <section className="pt-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {t("score.explain.why", { defaultValue: "Why this score" })}
          </h3>
          <ul className="mt-1.5 space-y-2.5">
            {items.map((item) => {
              const label = t(`score.${itemNamespace}.${item.key}`, { defaultValue: item.key });

              if (item.status === "not_checked") {
                return (
                  <li key={item.key} className="text-sm text-slate-500">
                    {t("score.explain.notChecked", {
                      label,
                      defaultValue: `${label}: not checked for this address.`,
                    })}
                  </li>
                );
              }

              if (item.kind === "category") {
                return (
                  <li key={item.key} className="flex items-center justify-between text-sm text-slate-700">
                    <span>{label}</span>
                    <span className={getScoreColorClass(item.score)}>{formatScoreValue(item.score)}</span>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <ul className="mt-1 space-y-1">
                    {item.criteria.map((criterion, index) => (
                      <li key={index} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <CriterionIcon satisfied={criterion.satisfied} />
                        <span>{criterion.detail}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="pt-3 pb-1.5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {t("score.explain.howCalculated", { defaultValue: "How it's calculated" })}
          </h3>
          <ul className="mt-1.5 space-y-1">
            {items.map((item) => {
              const label = t(`score.${itemNamespace}.${item.key}`, { defaultValue: item.key });
              return (
                <li key={item.key} className="flex items-center justify-between text-xs text-slate-600">
                  <span>{label}</span>
                  <span>
                    {item.status === "scored"
                      ? t("score.explain.contribution", {
                          weightPct: Math.round(item.weightPct),
                          score: formatScoreValue(item.score),
                          defaultValue: `${Math.round(item.weightPct)}% weight · scored ${formatScoreValue(item.score)}/100`,
                        })
                      : notAssessedLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </ModalContent>
    </Modal>
  );
}

export default ScoreExplainModal;
