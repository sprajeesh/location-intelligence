"use client";

import React, { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BUTTON_BASE_CLASSES,
  buttonColorVariants,
  getFocusRingClass,
  type ButtonActiveVariant,
  type ButtonVariant,
} from "./buttonStyles";

export type ButtonSize = "sm" | "md";

type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onClick"
  | "disabled"
  | "title"
  | "className"
  | "type"
  | "children"
  | "aria-label"
  | "aria-pressed"
  | "tabIndex"
>;

export interface ButtonProps extends NativeButtonProps {
  /** Omit for a text-only button (e.g. a "Save" CTA), or omit both icon and label when passing `children`. */
  icon?: LucideIcon;
  label?: string;
  /** Arbitrary content, overriding the icon+label rendering entirely (e.g. a menu item with a trailing indicator). */
  children?: React.ReactNode;
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
  /** Skip all built-in shape/color/focus classes -- className fully controls appearance. For one-off shapes (a floating edge tab, a full-width menu row) that don't fit any variant. */
  unstyled?: boolean;
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      icon: Icon,
      label,
      children,
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
      unstyled = false,
      className = "",
      iconClassName,
      labelClassName,
      tabIndex,
      ...rest
    },
    ref,
  ) {
    const shapeClasses = iconOnly
      ? ICON_ONLY_SIZE_CLASSES[size]
      : Icon
        ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
        : "inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap";

    const computedClassName = unstyled
      ? className
      : `
        ${shapeClasses}
        ${BUTTON_BASE_CLASSES}
        ${getFocusRingClass(variant)}
        ${buttonColorVariants({ variant, active, iconOnly, activeVariant })}
        ${className}
      `.trim();

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
        className={computedClassName}
        {...rest}
      >
        {children ?? (
          <>
            {Icon &&
              (iconClassName ? (
                <Icon className={iconClassName} aria-hidden="true" />
              ) : (
                <Icon
                  size={DEFAULT_ICON_SIZE[size]}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ))}
            {!iconOnly && <span className={labelClassName}>{label}</span>}
          </>
        )}
      </button>
    );
  },
);

export default Button;
