'use client';

import React from 'react';

/**
 * LoadingSkeleton — Placeholder skeletons while analyzing.
 *
 * Shows animated skeleton loaders for:
 * - Category group headers
 * - Facility list items
 * - Score display
 */

export interface LoadingSkeletonProps {
  count?: number;
}

export default function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          {/* Category header skeleton */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/30 animate-pulse">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-slate-600 rounded" />
              </div>
            </div>
            <div className="w-4 h-4 bg-slate-600 rounded" />
          </div>

          {/* Facility items skeleton */}
          {Array.from({ length: 2 }).map((_, itemIdx) => (
            <div
              key={itemIdx}
              className="px-3 py-2 rounded-lg bg-slate-700/20 animate-pulse"
            >
              <div className="h-3 w-3/4 bg-slate-600 rounded" />
            </div>
          ))}
        </div>
      ))}

      {/* Score skeleton */}
      <div className="pt-3 border-t border-slate-700/30 space-y-2">
        <div className="h-8 w-16 bg-slate-600 rounded mx-auto animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="h-3 w-full bg-slate-600 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
