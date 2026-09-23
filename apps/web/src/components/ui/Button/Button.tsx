"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

export interface ButtonProps {
  icon: LucideIcon;
  label: string;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  icon: Icon,
  label,
  title,
  onClick,
  active = false,
  pressed,
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-pressed={pressed}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        text-sm font-medium whitespace-nowrap
        transition-all duration-150
        focus-ring-inset active:scale-[0.97]
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          active
            ? "bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200"
            : "text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200"
        }
        ${className}
      `.trim()}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export default Button;
