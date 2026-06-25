"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

export interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
}

export function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      type="button"
      className={`
        w-8 h-8 flex items-center justify-center rounded-lg
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          active
            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            : "text-slate-300 hover:text-slate-100 hover:bg-white/10 active:bg-white/15"
        }
      `}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export default ToolbarButton;
