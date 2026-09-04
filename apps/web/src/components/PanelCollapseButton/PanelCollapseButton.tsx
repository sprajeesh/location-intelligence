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
      className={`hidden md:flex fixed z-50 w-10 h-14 bg-white border-2 border-slate-300 rounded-r-md items-center justify-center hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-md hover:shadow-lg group pointer-events-auto hover:scale-110 ${positionClass}`}
      aria-expanded={isExpanded}
      aria-label={
        isExpanded ? "Collapse results panel" : "Expand results panel"
      }
      title={isExpanded ? "Collapse results panel" : "Expand results panel"}
    >
      {isExpanded ? (
        <ChevronLeft className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
      ) : (
        <ChevronRight className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
      )}
    </button>
  );
}

export default PanelCollapseButton;
