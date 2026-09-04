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
    // Desktop: button position depends on panel state
    // When expanded: pokes out from panel edge; when collapsed: moves to left edge center
    const positionClass = isExpanded
      ? "top-1/2 -translate-y-1/2 md:left-[calc(360px-5px)] lg:left-[calc(400px-5px)] xl:left-[calc(440px-5px)]"
      : "top-1/2 -translate-y-1/2 left-0";

    return (
      <button
        onClick={onToggle}
        className={`fixed z-50 w-10 h-14 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-md hover:shadow-lg group pointer-events-auto hover:scale-110 ${positionClass}`}
        aria-label={isExpanded ? "Close panel" : "Open panel"}
        title={isExpanded ? "Close panel" : "Open panel"}
      >
        {isExpanded ? (
          <ChevronLeft className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
        ) : (
          <ChevronRight className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
        )}
      </button>
    );
  }

  // Mobile: button position depends on panel state
  // When expanded: at panel's bottom edge; when collapsed: moves to left edge center
  const positionClass = isExpanded
    ? "top-[60vh] left-1/2 -translate-x-1/2 -translate-y-1/2"
    : "top-1/2 -translate-y-1/2 left-0";

  return (
    <button
      onClick={onToggle}
      className={`absolute z-30 w-12 h-6 bg-white border border-slate-200 rounded-t-md flex items-center justify-center hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md group pointer-events-auto ${positionClass}`}
      aria-label={isExpanded ? "Close panel" : "Open panel"}
      title={isExpanded ? "Close panel" : "Open panel"}
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
