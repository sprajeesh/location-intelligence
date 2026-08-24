import {
  computeDefaultWeightsForActiveCategories,
  getActiveCompositeCategories,
  resolveCategoryWeightsForRequest,
} from "./facilitySelection";
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

const categories: Category[] = [
  makeCategory({ id: "schools", compositeCategory: "education" }),
  makeCategory({ id: "kindergartens", compositeCategory: "education" }),
  makeCategory({ id: "bus_stops", compositeCategory: "transport" }),
  makeCategory({ id: "parks", compositeCategory: "recreation" }),
];

describe("getActiveCompositeCategories", () => {
  it("returns the composite category for every selected facility, deduped", () => {
    expect(getActiveCompositeCategories(categories, ["schools", "kindergartens"])).toEqual([
      "education",
    ]);
  });

  it("returns one entry per distinct composite category represented", () => {
    const active = getActiveCompositeCategories(categories, ["schools", "bus_stops"]);
    expect(active.sort()).toEqual(["education", "transport"]);
  });

  it("returns an empty array when nothing is selected", () => {
    expect(getActiveCompositeCategories(categories, [])).toEqual([]);
  });

  it("ignores composite categories with no selected facility", () => {
    expect(getActiveCompositeCategories(categories, ["schools"])).not.toContain("recreation");
  });
});

describe("computeDefaultWeightsForActiveCategories", () => {
  const defaultRatios = {
    education: 0.4124,
    transport: 0.3093,
    healthcare: 0.2062,
    shopping: 0.0721,
    recreation: 0,
  };

  it("splits evenly across active categories when they're all zero-weighted by default (recreation-only bugfix)", () => {
    const result = computeDefaultWeightsForActiveCategories(["recreation"], defaultRatios);
    expect(result).toEqual({ recreation: 1 });
  });

  it("renormalizes the remaining active categories to sum to 1", () => {
    const result = computeDefaultWeightsForActiveCategories(["education", "transport"], defaultRatios);
    const education = result.education ?? 0;
    const transport = result.transport ?? 0;
    expect(education + transport).toBeCloseTo(1, 5);
    expect(education / transport).toBeCloseTo(0.4124 / 0.3093, 5);
  });

  it("keeps recreation at 0 while renormalizing the rest when recreation is also active", () => {
    const result = computeDefaultWeightsForActiveCategories(
      ["education", "transport", "recreation"],
      defaultRatios,
    );
    const education = result.education ?? 0;
    const transport = result.transport ?? 0;
    const recreation = result.recreation ?? 0;
    expect(recreation).toBe(0);
    expect(education + transport + recreation).toBeCloseTo(1, 5);
  });

  it("splits evenly when none of the active categories have a DB ratio", () => {
    const result = computeDefaultWeightsForActiveCategories(["shopping", "healthcare"], {
      shopping: 0,
      healthcare: 0,
    });
    expect(result.shopping).toBeCloseTo(0.5, 5);
    expect(result.healthcare).toBeCloseTo(0.5, 5);
  });
});

describe("resolveCategoryWeightsForRequest", () => {
  it("returns undefined when null (use backend defaults)", () => {
    expect(resolveCategoryWeightsForRequest(null)).toBeUndefined();
  });

  it("returns undefined when undefined", () => {
    expect(resolveCategoryWeightsForRequest(undefined)).toBeUndefined();
  });

  it("returns the weights as-is when customized", () => {
    const weights = { education: 0.6, transport: 0.4 };
    expect(resolveCategoryWeightsForRequest(weights)).toBe(weights);
  });
});
