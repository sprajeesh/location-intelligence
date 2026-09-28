"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, ChevronLeft, X as XIcon, HelpCircle as UnknownIcon, ChevronDown } from "lucide-react";
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
import { useState } from "react";

/**
 * ScoreExplainModal — unified explanation of score calculation.
 * Shows how each component (category/facility) contributed to the overall score
 * through weight × score = contribution, with visual and numeric clarity.
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
  /** Whether this modal was opened directly from a facility (no back) or drilled from overall score. */
  entryPoint?: "overall" | "facility";
  /** Called when user clicks the back button to return to overall score (only shown when entryPoint === 'overall'). */
  onBack?: () => void;
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

/** Calculates what the contribution to the overall score was for this item */
function calculateContribution(score: number | null, weightPct: number): number | null {
  if (score === null) return null;
  return (score * weightPct) / 100;
}

/** Unified contribution row: name | weight | score | contribution bars | criteria (expandable) */
function ContributionRow({
  icon: Icon,
  label,
  isNotAssessed,
  score,
  weightPct,
  notAssessedLabel,
  maxContribution,
  onSelect,
  selectLabel,
  hasCriteria,
  children,
}: {
  icon: LucideIcon;
  label: string;
  isNotAssessed: boolean;
  score: number | null;
  weightPct: number;
  notAssessedLabel: string;
  maxContribution: number;
  onSelect?: () => void;
  selectLabel?: string;
  hasCriteria?: boolean;
  children?: React.ReactNode;
}) {
  const [expandedCriteria, setExpandedCriteria] = useState(false);
  const contribution = calculateContribution(score, weightPct);

  const headerContent = (
    <>
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${isNotAssessed ? "text-slate-300" : "text-slate-400"}`}
        aria-hidden="true"
      />
      <span className={`flex-1 text-sm ${isNotAssessed ? "text-slate-400" : "font-medium text-slate-800"}`}>
        {label}
      </span>
      {!isNotAssessed && (
        <>
          <span className="text-xs text-slate-500 font-medium min-w-12 text-right">{weightPct}% wt</span>
          <span className={`text-sm font-semibold tabular-nums min-w-14 text-right ${getScoreColorClass(score)}`}>
            {formatScoreValue(score)}
          </span>
          <span className="text-xs text-slate-600 font-semibold min-w-16 text-right">
            {contribution !== null ? `${contribution.toFixed(1)}pt` : "—"}
          </span>
        </>
      )}
      {isNotAssessed && <span className="text-xs text-slate-400">{notAssessedLabel}</span>}
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
          className="flex items-center gap-2 w-full text-left -mx-1.5 px-1.5 py-2 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors focus-ring-inset"
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-center gap-2">{headerContent}</div>
      )}

      {!isNotAssessed && (
        <div className="mt-2 ml-6 space-y-1.5">
          {/* Contribution bar: shows weight × score = contribution */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Contribution</span>
              <span className="text-slate-700 font-medium">
                {contribution !== null ? `${contribution.toFixed(1)} / ${maxContribution.toFixed(1)}` : "—"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreBarColorClass(score)}`}
                style={{
                  width: `${
                    contribution !== null && maxContribution > 0
                      ? Math.max(0, Math.min(100, (contribution / maxContribution) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Score breakdown: shows the formula visually */}
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
            <span>{weightPct}% weight × {score !== null ? Math.round(score) : "—"}/100 score</span>
            <span className="font-semibold text-slate-700">=</span>
            <span className="font-medium text-slate-700">{contribution?.toFixed(1)} points</span>
          </div>
        </div>
      )}

      {hasCriteria && children && (
        <button
          type="button"
          onClick={() => setExpandedCriteria(!expandedCriteria)}
          className="mt-1.5 ml-6 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 -mx-1.5 px-1.5 py-1 rounded hover:bg-slate-50 transition-colors"
          aria-expanded={expandedCriteria}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${expandedCriteria ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          {expandedCriteria ? "Hide criteria" : "Show criteria"}
        </button>
      )}

      {expandedCriteria && children && <div className="mt-1.5 ml-6">{children}</div>}
      {isNotAssessed && children && <div className="mt-1.5 ml-6">{children}</div>}
    </li>
  );
}

export function ScoreExplainModal({
  title,
  score,
  items,
  itemNamespace,
  onClose,
  onSelectItem,
  entryPoint,
  onBack,
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
  const showBackButton = entryPoint === "overall" && onBack;

  // Calculate total possible contribution (sum of all weights)
  const maxPossibleContribution = items.reduce((sum, item) => {
    const contribution = calculateContribution(item.score !== null ? 100 : null, item.weightPct);
    return sum + (contribution ?? 0);
  }, 0);

  // Calculate actual contribution from scored items
  const actualContribution = items.reduce((sum, item) => {
    const contribution = calculateContribution(item.score, item.weightPct);
    return sum + (contribution ?? 0);
  }, 0);

  const isOverallModal = itemNamespace === "categories";

  return (
    <Modal onClose={onClose} aria-labelledby={titleId} data-testid="score-explain-modal">
      {showBackButton && (
        <div className="border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium -ml-1 px-1 py-1 rounded hover:bg-slate-50 transition-colors focus-ring-inset"
            aria-label={t("score.explain.backToOverall", { defaultValue: "Back to overall score" })}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {t("score.explain.backToOverall", { defaultValue: "Back to overall score" })}
          </button>
        </div>
      )}
      <ModalHeader
        titleId={titleId}
        title={title}
        onClose={onClose}
        closeLabel={t("score.explain.close", { defaultValue: "Close" })}
      />
      <ModalContent>
        <div className="flex flex-col items-center gap-1 pt-3 pb-3">
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

        <section className="pt-3 pb-3 border-b border-slate-200" data-testid="explain-contribution-section">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {t("score.explain.howCalculated", { defaultValue: "How it's calculated" })}
          </h3>

          {/* Column headers for the contribution breakdown */}
          {!isOverallModal && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="flex-1 text-xs font-semibold text-slate-600">Item</span>
              <span className="text-xs font-semibold text-slate-600 min-w-12 text-right">Weight</span>
              <span className="text-xs font-semibold text-slate-600 min-w-14 text-right">Score</span>
              <span className="text-xs font-semibold text-slate-600 min-w-16 text-right">Contrib.</span>
            </div>
          )}

          <ul className="space-y-4">
            {items.map((item) => {
              const label = t(`score.${itemNamespace}.${item.key}`, { defaultValue: item.key });
              const isNotAssessed = item.status === "not_checked";
              const Icon =
                item.kind === "category"
                  ? getScoreCategoryIcon(item.key as CategoryId)
                  : getCategoryIcon(item.key);
              const canSelect = item.kind === "category" && !isNotAssessed && onSelectItem;

              return (
                <ContributionRow
                  key={item.key}
                  icon={Icon}
                  label={label}
                  isNotAssessed={isNotAssessed}
                  score={item.score}
                  weightPct={item.weightPct}
                  notAssessedLabel={notAssessedLabel}
                  maxContribution={maxPossibleContribution}
                  onSelect={canSelect ? () => onSelectItem(item.key) : undefined}
                  selectLabel={t("score.explain.openCategory", {
                    label,
                    defaultValue: `Explain the ${label} score`,
                  })}
                  hasCriteria={item.kind === "facility" && !isNotAssessed && item.criteria.length > 0}
                >
                  {item.kind === "facility" && !isNotAssessed && item.criteria.length > 0 && (
                    <ul className="space-y-1">
                      {item.criteria.map((criterion, index) => (
                        <li key={index} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <CriterionIcon satisfied={criterion.satisfied} />
                          <span>{criterion.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.status === "not_checked" && (
                    <p className="text-xs text-slate-400 mt-1">
                      {t("score.explain.notChecked", {
                        label,
                        defaultValue: `${label}: not checked for this address.`,
                      })}
                    </p>
                  )}
                </ContributionRow>
              );
            })}
          </ul>
        </section>

        {/* Aggregation summary */}
        <section className="pt-4 pb-2">
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-600 font-medium">Calculation Summary:</p>
            <div className="space-y-1.5 text-xs">
              {isOverallModal ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Weighted sum of categories:</span>
                    <span className="font-semibold text-slate-900">
                      {actualContribution.toFixed(1)} / {maxPossibleContribution.toFixed(1)} points
                    </span>
                  </div>
                  <p className="text-slate-600 italic">
                    Each category's score is multiplied by its weight percentage, then summed to create the overall location score.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Facility contributions:</span>
                    <span className="font-semibold text-slate-900">
                      {actualContribution.toFixed(1)} / {maxPossibleContribution.toFixed(1)} points
                    </span>
                  </div>
                  <p className="text-slate-600 italic">
                    Each facility's score is multiplied by its weight, then the category score is calculated from these weighted values.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </ModalContent>
    </Modal>
  );
}

export default ScoreExplainModal;
