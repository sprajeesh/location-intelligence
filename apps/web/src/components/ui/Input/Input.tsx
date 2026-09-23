"use client";

import React, { forwardRef } from "react";

/**
 * Shared boilerplate every native input in the app was independently
 * re-typing (bg/border/disabled-cursor/focus-ring). Size, color, and layout
 * stay per-caller via `className` since they genuinely differ per use case.
 */
export const INPUT_BASE_CLASSES = "bg-white border disabled:cursor-not-allowed focus-ring-flush";

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">;

export interface InputProps extends NativeInputProps {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...rest },
  ref,
) {
  return <input ref={ref} className={`${INPUT_BASE_CLASSES} ${className}`.trim()} {...rest} />;
});

export default Input;
