import { useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";

export function useCategoryColorMap(): Record<string, string> {
  const { categories } = useCategories();
  return useMemo(() => {
    const colors: Record<string, string> = {};
    for (const category of categories) {
      colors[category.id] = category.color;
    }
    return colors;
  }, [categories]);
}
