"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PanelCollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isDesktop: boolean;
}

export function PanelCollapseButton({
  isCollapsed,
  onToggle,
  isDesktop,
}: PanelCollapseButtonProps) {
  const isExpanded = !isCollapsed;

  if (isDesktop) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 w-6 h-12 bg-white border border-slate-200 rounded-r-md flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm hover:shadow-md group"
        aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
        title={isExpanded ? "Collapse panel" : "Expand panel"}
      >
        {isExpanded ? (
          <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-900" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-900" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-12 h-6 bg-white border border-slate-200 rounded-t-md flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm hover:shadow-md group"
      aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
      title={isExpanded ? "Collapse panel" : "Expand panel"}
    >
      {isExpanded ? (
        <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-900 rotate-90" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-900 rotate-90" />
      )}
    </button>
  );
}

export default PanelCollapseButton;
