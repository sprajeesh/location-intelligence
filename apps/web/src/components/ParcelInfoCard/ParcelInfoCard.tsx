import { useTranslations } from "next-intl";
import { FeatureInfoCard } from "@/components/FeatureInfoCard";
import type { ParcelFeature } from "@/types/parcel";
import type { CardPosition } from "@/utils/mapCardPosition";

export interface ParcelInfoCardProps {
  feature: ParcelFeature;
  position?: CardPosition | null;
  onClose: () => void;
}

/**
 * Property details for a matched parcel (appellation, intent, titles). Rows
 * whose value is null are dropped rather than rendered empty.
 */
export function ParcelInfoCard({ feature, position, onClose }: ParcelInfoCardProps) {
  const t = useTranslations();
  const { appellation, parcel_intent, titles } = feature.properties;

  const candidates = [
    {
      label: t("parcels.info.appellation", { defaultValue: "Appellation" }),
      value: appellation,
    },
    {
      label: t("parcels.info.parcelIntent", { defaultValue: "Parcel intent" }),
      value: parcel_intent,
    },
    {
      label: t("parcels.info.titles", { defaultValue: "Title(s)" }),
      value: titles,
    },
  ];
  const rows = candidates.filter(
    (row): row is { label: string; value: string } => row.value !== null,
  );

  return (
    <FeatureInfoCard
      title={t("parcels.info.title", { defaultValue: "Property Details" })}
      rows={rows}
      position={position ?? undefined}
      onClose={onClose}
    />
  );
}

export default ParcelInfoCard;
