"use client";

import React, { ReactNode } from "react";
import { Eye, EyeOff, ChevronUp } from "lucide-react";

/**
 * CategoryGroup — Collapsible category header with visibility toggle.
 *
 * Features:
 * - Toggle expand/collapse with count badge
 * - Eye icon to toggle marker visibility on map
 * - Animated chevron icon
 * - Color indicator
 */

export interface CategoryGroupProps {
  id: string;
  label: string;
  color: string;
  count: number;
  isExpanded: boolean;
  isVisible: boolean;
  onToggleExpand: () => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
  children?: ReactNode;
}

export default function CategoryGroup({
  id,
  label,
  color,
  count,
  isExpanded,
  isVisible,
  onToggleExpand,
  onToggleVisibility,
  children,
}: CategoryGroupProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      {/* TODO: Fix this later - div and button nesting is a bit awkward but it
      allows the whole header to be clickable for expand/collapse while still
      having a separate button for visibility toggle. We just need to stop
      propagation on the visibility button click. */}
      <div
        onClick={onToggleExpand}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-lg
          glass hover:glass-dark
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
          group
        `}
        aria-expanded={isExpanded}
        aria-controls={`category-${id}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Color dot */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
            aria-label={`${label} marker color`}
          />

          {/* Label and count */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-slate-100 truncate">{label}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 flex-shrink-0">
              {count}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {/* Visibility toggle */}
          <button
            onClick={onToggleVisibility}
            className={`
              p-1.5 rounded-lg transition-all duration-200
              ${
                isVisible
                  ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  : "text-slate-500 hover:text-slate-400 hover:bg-slate-700/20"
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            aria-pressed={isVisible}
            aria-label={`${isVisible ? "Hide" : "Show"} ${label} markers on map`}
            title={`${isVisible ? "Hide" : "Show"} markers`}
          >
            {isVisible ? (
              <Eye className="w-4 h-4" aria-hidden="true" />
            ) : (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Expand/collapse chevron */}
          <div className="p-1">
            <ChevronUp
              className={`
                w-4 h-4 text-slate-400 transition-transform duration-200
                ${isExpanded ? "rotate-180" : ""}
              `}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      {/* Expanded content */}
      {isExpanded && (
        <div id={`category-${id}`} className="animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
