import Link from "next/link";
import { BUTTON_BASE_CLASSES, buttonColorVariants, getFocusRingClass } from "@/components/ui/Button";

interface NotFoundContentProps {
  message: string;
  backHomeLabel: string;
  homeHref: string;
}

// Composes the shared Button primary look onto a next/link Link (rather than
// rendering <Button> itself) since this needs to be a real navigation link,
// not a <button>.
const BACK_HOME_CLASSES = `
  inline-block px-6 py-2 rounded-lg text-sm font-medium
  ${BUTTON_BASE_CLASSES}
  ${getFocusRingClass("primary")}
  ${buttonColorVariants({ variant: "primary" })}
`.trim();

export function NotFoundContent({ message, backHomeLabel, homeHref }: NotFoundContentProps) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white text-ink">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-slate-500">{message}</p>
        <Link href={homeHref} className={BACK_HOME_CLASSES}>
          {backHomeLabel}
        </Link>
      </div>
    </div>
  );
}
