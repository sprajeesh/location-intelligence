'use client';

import React, { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { DEFAULT_RADIUS_KM, MIN_RADIUS_KM, MAX_RADIUS_KM, RADIUS_STEP_KM } from '@/constants/radius';

export interface RadiusAdjusterProps {
  // Radius currently in effect for the displayed results
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  // Whether the stepper is expanded on first render
  defaultExpanded?: boolean;
  disabled?: boolean;
  // Called when the user commits a new radius via the Search button
  onSearch: (radius: number) => void;
}

export function RadiusAdjuster({
  initialValue = DEFAULT_RADIUS_KM,
  min = MIN_RADIUS_KM,
  max = MAX_RADIUS_KM,
  step = RADIUS_STEP_KM,
  defaultExpanded = false,
  disabled = false,
  onSearch,
}: RadiusAdjusterProps) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [draft, setDraft] = useState(initialValue);
  const radiusInputId = useId();

  const clamp = (value: number) => Math.min(max, Math.max(min, value));

  const handleStep = (delta: number) => {
    setDraft((prev) => clamp(prev + delta));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    setDraft(isNaN(parsed) ? min : parsed);
  };

  const handleInputBlur = () => {
    setDraft((prev) => clamp(prev));
  };

  const handleSearch = () => {
    const clamped = clamp(draft);
    setDraft(clamped);
    onSearch(clamped);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors active:text-slate-800 rounded"
      >
        <ChevronRight className="h-3.5 w-3.5" />
        {t('results.adjustRadius.caption', {
          defaultValue: 'Not seeing expected results? Adjust the search radius',
        })}
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-card rounded-lg p-3 flex flex-col gap-2">
      <label htmlFor={radiusInputId} className="text-xs text-slate-500">
        {t('results.adjustRadius.label', { defaultValue: 'Search radius' })}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          disabled={disabled || draft <= min}
          aria-label={t('results.adjustRadius.decrease', {
            defaultValue: 'Decrease radius',
          })}
          className="w-7 h-7 flex items-center justify-center rounded text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 border border-slate-200 active:bg-slate-100 active:scale-[0.97] focus-ring-flush"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          id={radiusInputId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          className="w-14 bg-white border border-slate-300 rounded px-2 py-1 text-sm text-center text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus-ring-flush"
        />
        <span className="text-xs text-slate-500">km</span>
        <button
          type="button"
          onClick={() => handleStep(step)}
          disabled={disabled || draft >= max}
          aria-label={t('results.adjustRadius.increase', {
            defaultValue: 'Increase radius',
          })}
          className="w-7 h-7 flex items-center justify-center rounded text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 border border-slate-200 active:bg-slate-100 active:scale-[0.97] focus-ring-flush"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleSearch}
          disabled={disabled}
          className="ml-auto px-3 py-1.5 rounded-lg font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-primary-800 active:scale-[0.98]"
        >
          {t('results.adjustRadius.search', { defaultValue: 'Search' })}
        </button>
      </div>
    </div>
  );
}

export default RadiusAdjuster;
