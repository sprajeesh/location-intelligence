"use client";

import React from "react";
import type { RouteStep } from "@/types/api";

export interface TurnByTurnStepProps {
  step: RouteStep;
  index: number;
}

function formatStepDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function TurnByTurnStep({ step, index }: TurnByTurnStepProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-700/30 last:border-0">
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center mt-0.5">
        <span className="text-xs font-medium text-slate-300">{index + 1}</span>
      </div>
      <p className="flex-1 text-sm text-slate-200 leading-snug min-w-0">
        {step.instruction}
      </p>
      {step.distanceM > 0 && (
        <span className="flex-shrink-0 text-xs text-slate-500 mt-0.5 whitespace-nowrap">
          {formatStepDistance(step.distanceM)}
        </span>
      )}
    </div>
  );
}

export default TurnByTurnStep;
