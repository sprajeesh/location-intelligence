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
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          active
            ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200"
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
