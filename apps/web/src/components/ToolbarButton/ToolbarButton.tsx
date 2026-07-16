"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
}

export function ToolbarButton(props: ToolbarButtonProps) {
  return <IconButton {...props} size="md" />;
}

export default ToolbarButton;
