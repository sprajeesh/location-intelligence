"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, X as XIcon, HelpCircle as UnknownIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Modal, ModalHeader, ModalContent } from "@/components/ui/Modal";
import { ScoreRing } from "@/components/ScoreRing";
import {
  formatScoreValue,
  getScoreBarColorClass,
  getScoreColorClass,
  getScoreColorTier,
} from "@/utils/scoreDisplay";
import { getCategoryIcon, getScoreCategoryIcon } from "@/utils/categoryIcons";
import type { CategoryId } from "@/types/api";
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
  /**
   * Drill-down from a category rollup row (overall modal only -- there's no
   * deeper level for a facility-type row in a category modal) into that
   * category's own explanation. Rows render as plain (non-interactive) when
   * this is omitted.
   */
  onSelectItem?: (key: string) => void;
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

/** icon + label + score row, with a thin score-colored progress bar underneath. */
function ExplainRow({
  icon: Icon,
  label,
  isNotAssessed,
  score,
  notAssessedLabel,
  onSelect,
  selectLabel,
  children,
}: {
  icon: LucideIcon;
  label: string;
  isNotAssessed: boolean;
  score: number | null;
  notAssessedLabel: string;
  /** Present only for a tappable category rollup row -- see ScoreExplainModalProps.onSelectItem. */
  onSelect?: () => void;
  selectLabel?: string;
  children?: React.ReactNode;
}) {
  const rowContent = (
    <>
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${isNotAssessed ? "text-slate-300" : "text-slate-400"}`}
        aria-hidden="true"
      />
      <span className={`flex-1 text-sm ${isNotAssessed ? "text-slate-400" : "font-medium text-slate-800"}`}>
        {label}
      </span>
      {isNotAssessed ? (
        <span className="text-xs text-slate-400">{notAssessedLabel}</span>
      ) : (
        <span className={`text-sm font-semibold tabular-nums ${getScoreColorClass(score)}`}>
          {formatScoreValue(score)}
        </span>
      )}
      {onSelect && <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" aria-hidden="true" />}
    </>
  );

  return (
    <li>
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-label={selectLabel}
          className="flex items-center gap-2 w-full text-left -mx-1.5 px-1.5 py-1 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors focus-ring-inset"
        >
          {rowContent}
        </button>
      ) : (
        <div className="flex items-center gap-2">{rowContent}</div>
      )}
      {isNotAssessed ? (
        <div className="h-1.5 rounded-full border border-dashed border-slate-200 mt-1.5 ml-6" />
      ) : (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5 ml-6">
          <div
            className={`h-full rounded-full ${getScoreBarColorClass(score)}`}
            style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }}
          />
        </div>
      )}
      {children}
    </li>
  );
}

/**
 * WeightDonut — compact multi-segment ring showing each scored item's share
 * of the overall weight, colored by that item's own score tier (so it reads
 * as "how much this counts, and how well it did" at a glance) exactly like
 * ScoreRing's tier coloring. Renders nothing with fewer than 2 scored items,
 * where a single-segment ring would carry no information.
 */
function WeightDonut({ items }: { items: ExplainItem[] }) {
  const scored = items.filter((item) => item.status === "scored" && item.weightPct > 0);
  if (scored.length < 2) return null;

  const size = 72;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 origin-center flex-shrink-0"
      aria-hidden="true"
      data-testid="weight-donut"
    >
      <circle cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-slate-100" />
      {scored.map((item) => {
        const length = (item.weightPct / 100) * circumference;
        const dashOffset = -offset;
        offset += length;
        return (
          <circle
            key={item.key}
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            stroke="currentColor"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            className={getScoreColorClass(item.score)}
          />
        );
      })}
    </svg>
  );
}

export function ScoreExplainModal({
  title,
  score,
  items,
  itemNamespace,
  onClose,
  onSelectItem,
}: ScoreExplainModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const notAssessedLabel = t("score.status.notAssessed", { defaultValue: "Not assessed" });
  const scoreTier = getScoreColorTier(score);
  const bandLabel =
    score !== null
      ? t(`score.explain.band.${scoreTier}`, {
          defaultValue: scoreTier === "good" ? "Good" : scoreTier === "moderate" ? "Average" : "Below average",
        })
      : notAssessedLabel;

  return (
    <Modal onClose={onClose} aria-labelledby={titleId} data-testid="score-explain-modal">
      <ModalHeader
        titleId={titleId}
        title={title}
        onClose={onClose}
        closeLabel={t("score.explain.close", { defaultValue: "Close" })}
      />
      <ModalContent>
        <div className="flex flex-col items-center gap-1 pt-3 pb-2">
          <ScoreRing
            score={score}
            size={120}
            scoreClassName="text-5xl font-bold text-ink tabular-nums tracking-tight"
            unitClassName="text-xs font-medium text-slate-400"
            trackClassName="stroke-slate-100"
          />
          <p className={`text-xs font-semibold uppercase tracking-wide ${getScoreColorClass(score)}`}>
            {bandLabel}
          </p>
        </div>

        <section className="pt-3" data-testid="explain-why-section">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {t("score.explain.why", { defaultValue: "Why this score" })}
          </h3>
          <ul className="mt-2 space-y-3">
            {items.map((item) => {
              const label = t(`score.${itemNamespace}.${item.key}`, { defaultValue: item.key });
              const isNotAssessed = item.status === "not_checked";
              const Icon =
                item.kind === "category"
                  ? getScoreCategoryIcon(item.key as CategoryId)
                  : getCategoryIcon(item.key);
              const canSelect = item.kind === "category" && !isNotAssessed && onSelectItem;

              return (
                <ExplainRow
                  key={item.key}
                  icon={Icon}
                  label={label}
                  isNotAssessed={isNotAssessed}
                  score={item.score}
                  notAssessedLabel={notAssessedLabel}
                  onSelect={canSelect ? () => onSelectItem(item.key) : undefined}
                  selectLabel={t("score.explain.openCategory", {
                    label,
                    defaultValue: `Explain the ${label} score`,
                  })}
                >
                  {isNotAssessed && (
                    <p className="mt-1 ml-6 text-xs text-slate-400">
                      {t("score.explain.notChecked", {
                        label,
                        defaultValue: `${label}: not checked for this address.`,
                      })}
                    </p>
                  )}
                  {item.kind === "facility" && !isNotAssessed && item.criteria.length > 0 && (
                    <ul className="mt-1.5 ml-6 space-y-1">
                      {item.criteria.map((criterion, index) => (
                        <li key={index} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <CriterionIcon satisfied={criterion.satisfied} />
                          <span>{criterion.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </ExplainRow>
              );
            })}
          </ul>
        </section>

        <section className="mt-4 pt-3 pb-1.5 border-t border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {t("score.explain.howCalculated", { defaultValue: "How it's calculated" })}
          </h3>
          <div className="mt-2 flex items-center gap-4">
            <WeightDonut items={items} />
            <ul className="flex-1 space-y-2">
              {items.map((item) => {
                const label = t(`score.${itemNamespace}.${item.key}`, { defaultValue: item.key });
                const isScored = item.status === "scored";
                return (
                  <li key={item.key}>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{label}</span>
                      <span>
                        {isScored
                          ? t("score.explain.contribution", {
                              weightPct: Math.round(item.weightPct),
                              score: formatScoreValue(item.score),
                              defaultValue: `${Math.round(item.weightPct)}% weight · scored ${formatScoreValue(item.score)}/100`,
                            })
                          : notAssessedLabel}
                      </span>
                    </div>
                    {isScored && (
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-primary-400"
                          style={{ width: `${Math.max(0, Math.min(100, item.weightPct))}%` }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </ModalContent>
    </Modal>
  );
}

export default ScoreExplainModal;
