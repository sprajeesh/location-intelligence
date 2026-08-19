import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface ModalFooterProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
}

export function ModalFooter({ className = "", children, ...rest }: ModalFooterProps) {
  return (
    <div
      {...rest}
      className={`flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 flex-shrink-0 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default ModalFooter;
