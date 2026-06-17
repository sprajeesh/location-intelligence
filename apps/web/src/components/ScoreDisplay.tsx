'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { ScoreResult } from '@/types/api';

/**
 * ScoreDisplay — Shows location scores and warnings.
 *
 * Displays:
 * - Overall score prominently
 * - Individual category scores (education, transport, healthcare, shopping)
 * - Coverage badge (e.g., "2/4 categories")
 * - Warnings if any (e.g., network errors, API issues)
 */

export interface ScoreDisplayProps {
  score: ScoreResult;
  warnings?: string[];
}

const ScoreCategoryItem: React.FC<{
  label: string;
  value: number | null;
  color: string;
}> = ({ label, value, color }) => {
  if (value === null) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-600">—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(value, 100)}%`,
              backgroundColor: color,
            }}
            aria-hidden="true"
          />
        </div>
        <span className={`font-semibold w-8 text-right ${color}`}>
          {value}
        </span>
      </div>
    </div>
  );
};

export default function ScoreDisplay({
  score,
  warnings = [],
}: ScoreDisplayProps) {
  const t = useTranslations();

  // Determine color for overall score
  let overallColor = 'text-red-400';
  if (score.overall && score.overall >= 70) {
    overallColor = 'text-green-400';
  } else if (score.overall && score.overall >= 50) {
    overallColor = 'text-yellow-400';
  }

  // Determine color for category scores
  const getCategoryColor = (value: number | null): string => {
    if (value === null) return 'text-slate-500';
    if (value >= 70) return 'text-green-400';
    if (value >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-3">
      {/* Overall Score */}
      <div className="text-center">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {t('score.title', { defaultValue: 'Location Score' })}
        </h3>
        <div className="flex flex-col items-center gap-1">
          <div
            className={`text-3xl font-bold ${overallColor} transition-colors duration-300`}
          >
            {score.overall !== null ? score.overall : '—'}
          </div>
          <p className="text-xs text-slate-400">
            {t('score.coverage', {
              count: score.coverage?.split('/')[0] ?? '0',
              total: score.coverage?.split('/')[1] ?? '0',
              defaultValue: `Based on ${score.coverage}`,
            })}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-1.5 pt-2 border-t border-slate-700/30">
        <ScoreCategoryItem
          label={t('score.education', { defaultValue: 'Education' })}
          value={score.education}
          color={getCategoryColor(score.education)}
        />
        <ScoreCategoryItem
          label={t('score.transport', { defaultValue: 'Transport' })}
          value={score.transport}
          color={getCategoryColor(score.transport)}
        />
        <ScoreCategoryItem
          label={t('score.healthcare', { defaultValue: 'Healthcare' })}
          value={score.healthcare}
          color={getCategoryColor(score.healthcare)}
        />
        <ScoreCategoryItem
          label={t('score.shopping', { defaultValue: 'Shopping' })}
          value={score.shopping}
          color={getCategoryColor(score.shopping)}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="pt-2 border-t border-slate-700/30 space-y-1">
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className="text-xs text-amber-400 flex items-start gap-2"
            >
              <svg
                className="w-3 h-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
