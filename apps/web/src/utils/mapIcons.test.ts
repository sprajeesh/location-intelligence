import {
  createFacilityIcon,
  createHouseIcon,
  createMainLocationIcon,
  createSelectedFacilityIcon,
} from "./mapIcons";

describe("map marker icons", () => {
  it("builds the address pin at 32px with its class name", () => {
    const icon = createMainLocationIcon();
    expect(icon.options.className).toBe("leaflet-main-marker");
    expect(icon.options.iconSize).toEqual([32, 32]);
    expect(icon.options.iconAnchor).toEqual([16, 16]);
    expect(icon.options.popupAnchor).toEqual([0, -16]);
    expect(icon.options.html).toContain("rgb(var(--color-error-500))");
  });

  it("builds the house icon around the supplied glyph, with no popup offset", () => {
    const icon = createHouseIcon("<svg data-glyph></svg>");
    expect(icon.options.className).toBe("leaflet-house-marker");
    expect(icon.options.html).toContain("<svg data-glyph></svg>");
    expect(icon.options.html).toContain("rgb(var(--color-warning-500))");
    expect(icon.options.popupAnchor).toEqual([0, 0]);
  });

  it("colours a facility icon with the category colour and glyph", () => {
    const icon = createFacilityIcon("#123456", "<svg data-glyph></svg>");
    expect(icon.options.className).toBe("leaflet-category-marker");
    expect(icon.options.iconSize).toEqual([28, 28]);
    expect(icon.options.html).toContain("background: #123456;");
    expect(icon.options.html).toContain("<svg data-glyph></svg>");
  });

  it("builds the selected facility icon at 38px with a pulsing halo", () => {
    const icon = createSelectedFacilityIcon("#123456", "<svg data-glyph></svg>");
    expect(icon.options.className).toBe("leaflet-selected-marker");
    expect(icon.options.iconSize).toEqual([38, 38]);
    expect(icon.options.popupAnchor).toEqual([0, -19]);
    expect(icon.options.html).toContain("leaflet-selected-pulse");
    expect(icon.options.html).toContain("<svg data-glyph></svg>");
  });
});
