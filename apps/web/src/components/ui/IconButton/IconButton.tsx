"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

export type IconButtonSize = "sm" | "md";

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  size?: IconButtonSize;
  className?: string;
  iconClassName?: string;
  tabIndex?: number;
}

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  md: "w-8 h-8 flex items-center justify-center rounded-lg",
  sm: "p-1.5 rounded-lg",
};

const DEFAULT_ICON_SIZE: Record<IconButtonSize, number> = {
  md: 16,
  sm: 16,
};

export function IconButton({
  icon: Icon,
  label,
  title,
  onClick,
  active = false,
  pressed,
  disabled = false,
  size = "md",
  className = "",
  iconClassName,
  tabIndex,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      tabIndex={tabIndex}
      className={`
        ${SIZE_CLASSES[size]}
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          active
            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            : "text-slate-300 hover:text-slate-100 hover:bg-white/10 active:bg-white/15"
        }
        ${className}
      `.trim()}
    >
      {iconClassName ? (
        <Icon className={iconClassName} aria-hidden="true" />
      ) : (
        <Icon size={DEFAULT_ICON_SIZE[size]} strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}

export default IconButton;
