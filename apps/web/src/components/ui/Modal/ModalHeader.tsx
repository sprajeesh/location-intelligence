"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export interface ModalHeaderProps {
  title: ReactNode;
  titleId?: string;
  onClose: () => void;
  closeLabel: string;
  className?: string;
}

export function ModalHeader({ title, titleId, onClose, closeLabel, className = "" }: ModalHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-slate-700/60 flex-shrink-0 ${className}`.trim()}
    >
      <h2 id={titleId} className="text-base font-semibold text-slate-100">
        {title}
      </h2>
      <IconButton icon={X} label={closeLabel} onClick={onClose} />
    </div>
  );
}

export default ModalHeader;
