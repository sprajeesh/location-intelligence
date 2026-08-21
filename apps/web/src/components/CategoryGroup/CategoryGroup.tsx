"use client";

import React, { ReactNode } from "react";
import { Eye, EyeOff, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";

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
      {/* Header row — the expand/collapse button (which also contains the
      chevron) and the visibility toggle are siblings (not nested), since a
      <button> cannot legally contain another <button>. */}
      <div
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-lg
          bg-white hover:bg-slate-50 border border-slate-200
          transition-all duration-200
          group
        `}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center justify-between gap-3 flex-1 min-w-0 text-left rounded-lg focus-ring-inset active:opacity-80"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? `category-${id}` : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              aria-label={`${label} marker color`}
            />

            {/* Label and count */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-slate-900 truncate">{label}</span>
              <Badge label={count} tone="count" className="flex-shrink-0" />
            </div>
          </div>

          {/* Expand/collapse chevron */}
          <ChevronUp
            className={`
              w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0
              ${isExpanded ? "" : "rotate-180"}
            `}
            aria-hidden="true"
          />
        </button>

        {/* Right side controls */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {/* Visibility toggle */}
          <IconButton
            icon={isVisible ? Eye : EyeOff}
            size="sm"
            pressed={isVisible}
            onClick={onToggleVisibility}
            label={`${isVisible ? "Hide" : "Show"} ${label} markers on map`}
            title={`${isVisible ? "Hide" : "Show"} markers`}
            className={
              isVisible
                ? "text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                : "text-slate-400 hover:text-slate-500 hover:bg-slate-100"
            }
          />
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
