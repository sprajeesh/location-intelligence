import type { Category } from "@/types/api";
import { CATEGORY_DISPLAY_ORDER } from "@/utils/scoreDisplay";

export interface FacilityCategoryGroup {
  compositeCategory: string;
  facilities: Category[];
}

/**
 * Groups facility types by their composite category, ordering known
 * categories per CATEGORY_DISPLAY_ORDER (for consistency with the score
 * panel) and any unrecognized category (e.g. a new one added to the DB
 * before this list is updated) alphabetically at the end.
 */
export function groupCategoriesByComposite(categories: Category[]): FacilityCategoryGroup[] {
  const groups = new Map<string, Category[]>();
  for (const category of categories) {
    const bucket = groups.get(category.compositeCategory);
    if (bucket) {
      bucket.push(category);
    } else {
      groups.set(category.compositeCategory, [category]);
    }
  }

  const knownOrder: readonly string[] = CATEGORY_DISPLAY_ORDER;
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const rankA = knownOrder.indexOf(a);
      const rankB = knownOrder.indexOf(b);
      if (rankA === -1 && rankB === -1) return a.localeCompare(b);
      if (rankA === -1) return 1;
      if (rankB === -1) return -1;
      return rankA - rankB;
    })
    .map(([compositeCategory, facilities]) => ({ compositeCategory, facilities }));
}
