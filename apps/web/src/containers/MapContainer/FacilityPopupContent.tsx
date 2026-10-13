import { useTranslations } from "next-intl";
import { FacilityRouteModePicker } from "@/components/FacilityRouteModePicker";
import type { Feature } from "@/types/api";
import { isValidHttpUrl } from "@/utils/url";
import { FACILITY_DETAIL_FIELDS } from "./mapConstants";

export interface FacilityPopupContentProps {
  feature: Feature;
  /** Shown only on mobile, where the results panel is a separate view. */
  onBackToResults?: () => void;
}

/** Body of a facility marker's Leaflet popup: name, distance, details, route picker. */
export function FacilityPopupContent({ feature, onBackToResults }: FacilityPopupContentProps) {
  const t = useTranslations();
  const details = feature.details;

  return (
    <>
      <div className="text-sm font-semibold mb-1">{feature.name}</div>
      <div className="text-xs text-slate-600 mb-2">
        <strong>{t("map.markerPopup.distance")}:</strong>{" "}
        {feature.distanceKm.toFixed(2)} km
      </div>
      {details && (
        <div className="text-xs text-slate-600 mb-2 space-y-0.5">
          {FACILITY_DETAIL_FIELDS.map(({ key, i18nKey }) => {
            const value = details[key];
            if (!value) return null;
            const isWebsiteLink = key === "website" && isValidHttpUrl(value);
            return (
              <div key={key}>
                <strong>{t(i18nKey)}:</strong>{" "}
                {isWebsiteLink ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="underline">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </div>
            );
          })}
        </div>
      )}
      {details?.image && isValidHttpUrl(details.image) && (
        <img
          src={details.image}
          alt={feature.name}
          loading="lazy"
          className="mb-2 max-h-24 w-full rounded object-cover"
          onError={(event) => {
            // A URL can pass the http(s) check above and still 404 or
            // fail to load (stale/renamed Commons file) -- hide the
            // element rather than showing the browser's broken-image icon.
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      <FacilityRouteModePicker feature={feature} onBackToResults={onBackToResults} />
    </>
  );
}

export default FacilityPopupContent;
