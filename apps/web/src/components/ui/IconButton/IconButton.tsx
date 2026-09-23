"use client";

import React, { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ButtonActiveVariant, ButtonSize, ButtonVariant } from "@/components/ui/Button";

export type IconButtonSize = ButtonSize;

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  activeVariant?: ButtonActiveVariant;
  pressed?: boolean;
  disabled?: boolean;
  size?: IconButtonSize;
  variant?: ButtonVariant;
  className?: string;
  iconClassName?: string;
  tabIndex?: number;
}

/** Icon-only presentation of Button -- see Button.tsx for the shared styling/behavior. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = "md", ...props },
  ref,
) {
  return <Button ref={ref} {...props} size={size} iconOnly />;
});

export default IconButton;
