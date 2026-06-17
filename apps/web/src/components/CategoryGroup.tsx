'use client';

import React, { ReactNode } from 'react';

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
      <button
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
            <span className="font-medium text-slate-100 truncate">
              {label}
            </span>
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
                  ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                  : 'text-slate-500 hover:text-slate-400 hover:bg-slate-700/20'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            aria-pressed={isVisible}
            aria-label={`${isVisible ? 'Hide' : 'Show'} ${label} markers on map`}
            title={`${isVisible ? 'Hide' : 'Show'} markers`}
          >
            {isVisible ? (
              // Eye open icon
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // Eye closed icon
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clipRule="evenodd"
                />
                <path d="M15.171 13.576l1.414 1.414A1 1 0 0018.414 13.17l-1.473-1.473A10.014 10.014 0 0019.542 10c-1.274-4.057-5.064-7-9.542-7a9.958 9.958 0 00-4.512 1.074l-1.78-1.781A1 1 0 003.707 2.293l14 14a1 1 0 001.414-1.414l-2.95-2.95z" />
              </svg>
            )}
          </button>

          {/* Expand/collapse chevron */}
          <div className="p-1">
            <svg
              className={`
                w-4 h-4 text-slate-400 transition-transform duration-200
                ${isExpanded ? 'rotate-180' : ''}
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div id={`category-${id}`} className="animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
