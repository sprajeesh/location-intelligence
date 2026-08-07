"use client";

import { useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useModalBehavior } from "@/hooks/useModalBehavior";

export interface ModalProps extends ComponentPropsWithoutRef<"div"> {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ onClose, children, className = "max-w-lg", ...rest }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ containerRef: dialogRef, onClose });

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full outline-none ${className}`.trim()}
      >
        <GlassPanel
          variant="panel"
          role="dialog"
          aria-modal="true"
          {...rest}
          className="flex flex-col max-h-[85vh]"
        >
          {children}
        </GlassPanel>
      </div>
    </div>
  );
}

export default Modal;
