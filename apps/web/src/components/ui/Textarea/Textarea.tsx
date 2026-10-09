"use client";

import React, { forwardRef } from "react";
import { INPUT_BASE_CLASSES } from "@/components/ui/Input";

type NativeTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export interface TextareaProps extends NativeTextareaProps {
  className?: string;
}

/** Multi-line sibling of Input: same brand border, typography, hover/disabled and focus styling. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`rounded-lg py-2.5 text-sm ${INPUT_BASE_CLASSES} ${className}`.trim()}
      {...rest}
    />
  );
});

export default Textarea;
