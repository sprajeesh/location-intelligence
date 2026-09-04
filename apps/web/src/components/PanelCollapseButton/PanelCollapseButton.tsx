"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PanelCollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function PanelCollapseButton({
  isCollapsed,
  onToggle,
}: PanelCollapseButtonProps) {
  const isExpanded = !isCollapsed;
  const positionClass = isExpanded
    ? "top-1/2 -translate-y-1/2 md:left-[calc(360px-5px)] lg:left-[calc(400px-5px)] xl:left-[calc(440px-5px)]"
    : "top-1/2 -translate-y-1/2 left-0";

  return (
    <button
      onClick={onToggle}
      className={`hidden md:flex fixed z-50 w-10 h-14 items-center justify-center bg-white border border-slate-200 rounded-r-lg shadow-card hover:bg-slate-50 hover:shadow-card-lg transition-all duration-150 focus-ring-flush active:scale-[0.97] group pointer-events-auto ${positionClass}`}
      aria-expanded={isExpanded}
      aria-label={
        isExpanded ? "Collapse results panel" : "Expand results panel"
      }
      title={isExpanded ? "Collapse results panel" : "Expand results panel"}
    >
      {isExpanded ? (
        <ChevronLeft className="w-6 h-6 text-slate-500 group-hover:text-slate-700" />
      ) : (
        <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-slate-700" />
      )}
    </button>
  );
}

export default PanelCollapseButton;
