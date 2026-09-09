"use client";

import { X } from "lucide-react";
import { SurfacePanel } from "@/components/ui/SurfacePanel";

export interface FeatureInfoRow {
  label: string;
  value: string;
}

export interface FeatureInfoCardProps {
  title: string;
  rows: FeatureInfoRow[];
  onClose: () => void;
  position?: { top?: number; left?: number; right?: number; bottom?: number };
}

/**
 * Displays feature details in a dismissible card overlay on the map.
 * Generic component that can display any feature's properties.
 * Originally built for parcel details, reusable for other geometry types.
 */
export function FeatureInfoCard({ title, rows, onClose, position }: FeatureInfoCardProps) {
  // Don't render if no rows to display
  if (rows.length === 0) {
    return null;
  }

  // Build positioning classes: if position is provided, use inline styles; otherwise use default classes
  const positionStyle = position
    ? {
        top: position.top !== undefined ? `${position.top}px` : undefined,
        left: position.left !== undefined ? `${position.left}px` : undefined,
        right: position.right !== undefined ? `${position.right}px` : undefined,
        bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
      }
    : undefined;

  const defaultClasses = !position ? "top-2 right-3" : "";

  return (
    <div
      className={`absolute z-[1000] pointer-events-auto ${defaultClasses}`}
      style={positionStyle}
    >
      <SurfacePanel variant="panel" className="p-3 text-xs max-w-xs">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-semibold text-slate-900">{title}</div>
          <button
            onClick={onClose}
            className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close feature details"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2">
              <span className="font-medium text-slate-700 flex-shrink-0">
                {row.label}:
              </span>
              <span className="text-slate-600 text-right break-words">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </SurfacePanel>
    </div>
  );
}

export default FeatureInfoCard;
