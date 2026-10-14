import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Non-blocking overlay shown over the map while an analysis is running.
 * Lets pointer events through so the map stays usable underneath.
 */
export function MapLoadingOverlay() {
  const t = useTranslations();

  return (
    <div className="absolute inset-0 bg-ink/10 backdrop-blur-xs flex items-center justify-center pointer-events-none">
      <div className="bg-white shadow-card-lg rounded-lg px-4 py-2 flex items-center gap-2">
        <Spinner size="sm" tone="neutral" />
        <span className="text-sm font-medium text-slate-700">
          {t("analyze.loading")}
        </span>
      </div>
    </div>
  );
}

export default MapLoadingOverlay;
