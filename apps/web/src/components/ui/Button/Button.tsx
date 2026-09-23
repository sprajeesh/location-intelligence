"use client";

import React, { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BUTTON_BASE_CLASSES,
  getFocusRingClass,
  getVariantClasses,
  type ButtonActiveVariant,
  type ButtonVariant,
} from "./buttonStyles";

export type ButtonSize = "sm" | "md";

export interface ButtonProps {
  /** Omit for a text-only button (e.g. a "Save" CTA). */
  icon?: LucideIcon;
  label: string;
  title?: string;
  /** Accessible name, when it needs to differ from the visible `label` (icon-only buttons always use `label`). */
  ariaLabel?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  activeVariant?: ButtonActiveVariant;
  pressed?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  /** Render icon-only (label becomes the accessible name via aria-label). */
  iconOnly?: boolean;
  /** Only meaningful when `iconOnly` is set. */
  size?: ButtonSize;
  className?: string;
  iconClassName?: string;
  /** Classes for the visible label span, e.g. "hidden sm:inline" to collapse to icon-only on narrow layouts. */
  labelClassName?: string;
  tabIndex?: number;
}

const ICON_ONLY_SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "w-8 h-8 flex items-center justify-center rounded-lg",
  sm: "p-1.5 rounded-lg",
};

const DEFAULT_ICON_SIZE: Record<ButtonSize, number> = {
  md: 16,
  sm: 16,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    icon: Icon,
    label,
    title,
    ariaLabel,
    onClick,
    active = false,
    activeVariant = "tint",
    pressed,
    disabled = false,
    variant = "toolbar",
    iconOnly = false,
    size = "md",
    className = "",
    iconClassName,
    labelClassName,
    tabIndex,
  },
  ref,
) {
  const shapeClasses = iconOnly
    ? ICON_ONLY_SIZE_CLASSES[size]
    : Icon
      ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
      : "inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={iconOnly ? (ariaLabel ?? label) : ariaLabel}
      title={title ?? label}
      aria-pressed={pressed}
      tabIndex={tabIndex}
      className={`
        ${shapeClasses}
        ${BUTTON_BASE_CLASSES}
        ${getFocusRingClass(variant)}
        ${getVariantClasses(variant, active, iconOnly, activeVariant)}
        ${className}
      `.trim()}
    >
      {Icon &&
        (iconClassName ? (
          <Icon className={iconClassName} aria-hidden="true" />
        ) : (
          <Icon size={DEFAULT_ICON_SIZE[size]} strokeWidth={2} aria-hidden="true" />
        ))}
      {!iconOnly && <span className={labelClassName}>{label}</span>}
    </button>
  );
});

export default Button;
