"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export interface CollapsibleCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  header: ReactNode;
  headerEnd?: ReactNode;
  // Extra controls (e.g. a visibility toggle) rendered as a sibling of the
  // header button rather than inside it -- a <button> cannot legally
  // contain another <button>.
  actions?: ReactNode;
  // Identifies which card this is (e.g. the category or route name), so the
  // chevron's accessible name is unique when multiple CollapsibleCards
  // render on the same page instead of every one being just "Expand".
  cardLabel: string;
  // Templates for the chevron button's accessible name in each state --
  // must contain a "{label}" placeholder, substituted with cardLabel.
  // Callers that render translated UI (e.g. CategoryScoreCard) should pass
  // localized templates; defaults to English for callers that don't.
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
  cardLabel,
  expandLabel = "Expand {label}",
  collapseLabel = "Collapse {label}",
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
    <Button
      unstyled
      onClick={onToggle}
      className={`w-full flex justify-between px-3 py-2 focus-ring-inset rounded-lg active:bg-slate-50 active:scale-[0.99] ${headerClassName}`.trim()}
      aria-expanded={isExpanded}
      aria-controls={contentId}
    >
      {header}
      {headerEnd}
    </Button>
  );

  return (
    <div {...wrapperProps} className={`rounded-lg border ${className} ${wrapperProps?.className ?? ""}`.trim()}>
      <div className="flex items-center pr-3">
        <div className="flex-1 min-w-0">{headerButton}</div>
        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">{actions}</div>
        )}
        <IconButton
          unstyled
          icon={ChevronDown}
          iconClassName={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          onClick={onToggle}
          className="flex items-center flex-shrink-0 ml-2 p-1 -m-1 focus-ring-inset rounded-lg"
          label={(isExpanded ? collapseLabel : expandLabel).replace(/\{label\}/g, cardLabel)}
        />
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
