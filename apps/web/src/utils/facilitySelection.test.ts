import {
  computeDefaultWeightsForActiveCategories,
  getActiveCompositeCategories,
  redistributeOnActivate,
  redistributeOnDeactivate,
  redistributeOnSliderChange,
  resolveCategoryWeightsForRequest,
  roundWeightsForDisplay,
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

describe("redistributeOnSliderChange", () => {
  it("takes the delta proportionally from the other active categories", () => {
    const result = redistributeOnSliderChange(
      { education: 0.35, healthcare: 0.4, transport: 0.25 },
      "education",
      0.45,
    );
    expect(result.education).toBeCloseTo(0.45, 5);
    expect(result.healthcare).toBeCloseTo(0.3385, 3);
    expect(result.transport).toBeCloseTo(0.2115, 3);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it("gives the delta back proportionally when the slider is decreased", () => {
    const result = redistributeOnSliderChange(
      { education: 0.6, transport: 0.4 },
      "education",
      0.2,
    );
    expect(result.education).toBeCloseTo(0.2, 5);
    expect(result.transport).toBeCloseTo(0.8, 5);
  });

  it("water-fills: dragging a slider all the way to 100% zeroes out every other active category", () => {
    const result = redistributeOnSliderChange(
      { education: 0.02, healthcare: 0.08, transport: 0.9 },
      "transport",
      1,
    );
    expect(result.transport).toBeCloseTo(1, 9);
    expect(result.education).toBeCloseTo(0, 9);
    expect(result.healthcare).toBeCloseTo(0, 9);
  });

  it("is a no-op when it's the only active category", () => {
    const result = redistributeOnSliderChange({ education: 1 }, "education", 0.5);
    expect(result).toEqual({ education: 1 });
  });
});

describe("redistributeOnActivate", () => {
  const defaultRatios = {
    education: 0.4124,
    transport: 0.3093,
    healthcare: 0.2062,
    shopping: 0.0721,
    recreation: 0,
  };

  it("gives a newly-activated category the full 100% when it's the first active category", () => {
    expect(redistributeOnActivate({}, "education", defaultRatios)).toEqual({ education: 1 });
  });

  it("borrows the new category's default-ratio share proportionally from existing categories", () => {
    const result = redistributeOnActivate({ education: 1 }, "transport", defaultRatios);
    const expectedTransportShare = 0.3093 / (0.4124 + 0.3093);
    expect(result.transport).toBeCloseTo(expectedTransportShare, 5);
    expect(result.education).toBeCloseTo(1 - expectedTransportShare, 5);
    expect((result.education ?? 0) + (result.transport ?? 0)).toBeCloseTo(1, 9);
  });
});

describe("redistributeOnDeactivate", () => {
  it("returns the freed weight proportionally to the remaining active categories", () => {
    const result = redistributeOnDeactivate({ education: 0.5, transport: 0.3, healthcare: 0.2 }, "healthcare");
    expect(result.healthcare).toBeUndefined();
    expect(result.education).toBeCloseTo(0.625, 5);
    expect(result.transport).toBeCloseTo(0.375, 5);
    expect((result.education ?? 0) + (result.transport ?? 0)).toBeCloseTo(1, 9);
  });

  it("returns an empty map when the last active category is deactivated", () => {
    expect(redistributeOnDeactivate({ education: 1 }, "education")).toEqual({});
  });
});

describe("roundWeightsForDisplay", () => {
  it("rounds to integers that sum to exactly 100", () => {
    const result = roundWeightsForDisplay({ education: 1 / 3, transport: 1 / 3, healthcare: 1 / 3 });
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("returns an empty map for an empty input", () => {
    expect(roundWeightsForDisplay({})).toEqual({});
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
