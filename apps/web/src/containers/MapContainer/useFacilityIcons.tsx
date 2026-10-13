import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type L from "leaflet";
import { MapPin } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { createFacilityIcon, createSelectedFacilityIcon } from "@/utils/mapIcons";
import { FALLBACK_MARKER_COLOR } from "./mapConstants";

/**
 * Builds the facility marker icons once per category set, rather than on every
 * render. Creating a new `L.DivIcon` per marker forces react-leaflet to swap
 * the icon on every marker whenever anything in the store changes.
 */
export function useFacilityIcons() {
  const { categories } = useCategories();

  return useMemo(() => {
    const defaultGlyph = renderToStaticMarkup(
      <MapPin color="rgb(var(--color-white))" size={14} strokeWidth={2.5} />,
    );
    const regular = new Map<string, L.DivIcon>();
    const selected = new Map<string, L.DivIcon>();

    for (const category of categories) {
      const Icon = getCategoryIcon(category.id);
      const glyph = renderToStaticMarkup(
        <Icon color="rgb(var(--color-white))" size={14} strokeWidth={2.5} />,
      );
      const color = category.color || FALLBACK_MARKER_COLOR;
      regular.set(category.id, createFacilityIcon(color, glyph));
      selected.set(category.id, createSelectedFacilityIcon(color, glyph));
    }

    const fallbackRegular = createFacilityIcon(FALLBACK_MARKER_COLOR, defaultGlyph);
    const fallbackSelected = createSelectedFacilityIcon(FALLBACK_MARKER_COLOR, defaultGlyph);

    return {
      getFacilityIcon: (category: string) => regular.get(category) ?? fallbackRegular,
      getSelectedFacilityIcon: (category: string) =>
        selected.get(category) ?? fallbackSelected,
    };
  }, [categories]);
}
