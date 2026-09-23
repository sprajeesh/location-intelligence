"use client";

import React, { forwardRef } from "react";

export type InputSize = "sm" | "md" | "lg";
export type InputAlign = "left" | "center" | "right";

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "size">;

export interface InputProps extends NativeInputProps {
  size?: InputSize;
  align?: InputAlign;
  className?: string;
}

/**
 * Brand color, typography, hover/disabled state, and focus ring -- the
 * baseline every text/number input in the app shares. Horizontal padding
 * stays caller-supplied via `className` (e.g. icon insets, compact fields)
 * rather than baked into `size`, since a caller-supplied `px-*`/`pl-*`/`pr-*`
 * isn't guaranteed to override a base one: Tailwind resolves same-property
 * utilities by their order in the generated stylesheet, not by their order
 * in the className string.
 */
export const INPUT_BASE_CLASSES =
  "bg-white border border-slate-300 text-ink placeholder-slate-400 transition-all duration-150 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed focus-ring-flush";

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "rounded py-0.5 text-xs",
  md: "rounded py-1 text-sm",
  lg: "rounded-lg py-2.5 text-sm",
};

const ALIGN_CLASSES: Record<InputAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", align = "left", className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`${SIZE_CLASSES[size]} ${ALIGN_CLASSES[align]} ${INPUT_BASE_CLASSES} ${className}`.trim()}
      {...rest}
    />
  );
});

export default Input;
