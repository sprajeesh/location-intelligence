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
  // The map toolbar keeps its desktop footprint on mobile, so opt out of
  // IconButton's below-md 44px touch-target growth.
  return <IconButton {...props} size="md" className="max-md:w-8! max-md:h-8!" />;
}

export default ToolbarButton;
