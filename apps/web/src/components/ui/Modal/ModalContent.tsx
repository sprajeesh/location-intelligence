import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface ModalContentProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
}

export function ModalContent({ className = "", children, ...rest }: ModalContentProps) {
  return (
    <div {...rest} className={`flex-1 overflow-y-auto px-4 py-3 space-y-4 ${className}`.trim()}>
      {children}
    </div>
  );
}

export default ModalContent;
