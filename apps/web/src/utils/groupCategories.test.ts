import { groupCategoriesByComposite } from "./groupCategories";
import type { Category } from "@/types/api";

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: "schools",
    label: "Schools",
    implemented: true,
    color: "#F59E0B",
    isDefault: false,
    compositeCategory: "education",
    ...overrides,
  };
}

describe("groupCategoriesByComposite", () => {
  it("groups facility types by their composite category", () => {
    const categories = [
      makeCategory({ id: "schools", compositeCategory: "education" }),
      makeCategory({ id: "bus_stops", compositeCategory: "transport" }),
      makeCategory({ id: "kindergartens", compositeCategory: "education" }),
    ];

    const groups = groupCategoriesByComposite(categories);
    const education = groups.find((g) => g.compositeCategory === "education");
    const transport = groups.find((g) => g.compositeCategory === "transport");

    expect(education?.facilities.map((f) => f.id)).toEqual(["schools", "kindergartens"]);
    expect(transport?.facilities.map((f) => f.id)).toEqual(["bus_stops"]);
  });

  it("orders known categories per CATEGORY_DISPLAY_ORDER", () => {
    const categories = [
      makeCategory({ id: "supermarkets", compositeCategory: "shopping" }),
      makeCategory({ id: "schools", compositeCategory: "education" }),
      makeCategory({ id: "gps", compositeCategory: "healthcare" }),
      makeCategory({ id: "bus_stops", compositeCategory: "transport" }),
      makeCategory({ id: "parks", compositeCategory: "recreation" }),
    ];

    const groups = groupCategoriesByComposite(categories);
    expect(groups.map((g) => g.compositeCategory)).toEqual([
      "education",
      "transport",
      "healthcare",
      "shopping",
      "recreation",
    ]);
  });

  it("places unrecognized composite categories at the end, sorted alphabetically", () => {
    const categories = [
      makeCategory({ id: "schools", compositeCategory: "education" }),
      // Input order is reverse-lexical ("zzz_..." before "aaa_...") so this
      // only passes if the two unknowns are actually alphabetically sorted,
      // not merely left in their original appearance order.
      makeCategory({ id: "mystery", compositeCategory: "zzz_new_category" }),
      makeCategory({ id: "enigma", compositeCategory: "aaa_another_category" }),
    ];

    const groups = groupCategoriesByComposite(categories);
    expect(groups.map((g) => g.compositeCategory)).toEqual([
      "education",
      "aaa_another_category",
      "zzz_new_category",
    ]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupCategoriesByComposite([])).toEqual([]);
  });
});
