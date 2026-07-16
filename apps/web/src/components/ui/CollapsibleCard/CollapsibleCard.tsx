"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface CollapsibleCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  header: ReactNode;
  headerEnd?: ReactNode;
  children?: ReactNode;
  contentId?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  wrapperProps?: ComponentPropsWithoutRef<"div"> & Record<`data-${string}`, string | number | boolean>;
}

export function CollapsibleCard({
  isExpanded,
  onToggle,
  header,
  headerEnd,
  children,
  contentId,
  className = "",
  headerClassName = "",
  contentClassName = "",
  wrapperProps,
}: CollapsibleCardProps) {
  return (
    <div {...wrapperProps} className={`rounded-lg border ${className} ${wrapperProps?.className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex justify-between px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg ${headerClassName}`.trim()}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        {header}
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerEnd}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded && (
        <div id={contentId} className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleCard;
