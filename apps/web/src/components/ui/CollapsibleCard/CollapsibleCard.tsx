"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface CollapsibleCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  header: ReactNode;
  headerEnd?: ReactNode;
  // Extra controls (e.g. a visibility toggle) rendered as a sibling of the
  // header button rather than inside it -- a <button> cannot legally
  // contain another <button>.
  actions?: ReactNode;
  // Accessible name for the chevron button in each state. Callers that
  // render translated UI (e.g. CategoryScoreCard) should pass localized
  // text; defaults to English for callers that don't.
  expandLabel?: string;
  collapseLabel?: string;
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
  actions,
  expandLabel = "Expand",
  collapseLabel = "Collapse",
  children,
  contentId,
  className = "",
  headerClassName = "",
  contentClassName = "",
  wrapperProps,
}: CollapsibleCardProps) {
  // The chevron sits outside the header button (rather than at its trailing
  // edge) so `actions` -- when provided -- can render between headerEnd and
  // the chevron without ever nesting a <button> inside another <button>.
  const headerButton = (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex justify-between px-3 py-2 focus-ring-inset rounded-lg active:bg-slate-50 active:scale-[0.99] ${headerClassName}`.trim()}
      aria-expanded={isExpanded}
      aria-controls={contentId}
    >
      {header}
      {headerEnd}
    </button>
  );

  return (
    <div {...wrapperProps} className={`rounded-lg border ${className} ${wrapperProps?.className ?? ""}`.trim()}>
      <div className="flex items-center pr-3">
        <div className="flex-1 min-w-0">{headerButton}</div>
        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">{actions}</div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center flex-shrink-0 ml-2 p-1 -m-1 focus-ring-inset rounded-lg"
          aria-label={isExpanded ? collapseLabel : expandLabel}
        >
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isExpanded && (
        <div id={contentId} className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleCard;
