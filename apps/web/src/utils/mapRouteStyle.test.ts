import { routeStyleForMode } from "./mapRouteStyle";

describe("routeStyleForMode", () => {
  it("draws driving as a solid primary-coloured line", () => {
    expect(routeStyleForMode("driving")).toMatchObject({
      color: "rgb(var(--color-primary-500))",
      weight: 12,
      dashArray: undefined,
    });
  });

  it("draws walking as a dotted success-coloured line", () => {
    expect(routeStyleForMode("walking")).toMatchObject({
      color: "rgb(var(--color-success-500))",
      weight: 6,
      dashArray: "1, 15",
      lineCap: "round",
    });
  });

  it("draws cycling as a solid warning-coloured line", () => {
    expect(routeStyleForMode("cycling")).toMatchObject({
      color: "rgb(var(--color-warning-500))",
      weight: 12,
      dashArray: undefined,
    });
  });
});
