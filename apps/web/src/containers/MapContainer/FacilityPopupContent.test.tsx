import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/i18n/en.json";
import { useLocationStore } from "@/store";
import type { Feature } from "@/types/api";
import { FacilityPopupContent } from "./FacilityPopupContent";

jest.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) =>
    key.split(".").reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      ns ? (en as Record<string, unknown>)[ns] : en,
    ),
}));
jest.mock("@/components/FacilityRouteModePicker", () => ({
  FacilityRouteModePicker: () => null,
}));

const REMOVE_LABEL = en.mapCorrection.remove.button;

function feature(id: string): Feature {
  return { id, name: "Corner Cafe", category: "restaurants", lat: -36.8, lon: 174.7, distanceKm: 0.4 };
}

afterEach(() => {
  useLocationStore.setState({ correctionMode: "off", correctionRemoveTarget: null });
});

describe("FacilityPopupContent remove action", () => {
  it("is hidden when the feature ID does not parse to an OSM element", () => {
    render(<FacilityPopupContent feature={feature("manual_12345")} />);
    expect(screen.queryByRole("button", { name: REMOVE_LABEL })).not.toBeInTheDocument();
  });

  it.each([
    ["osm_node_12345", "node/12345"],
    ["osm_way_987", "way/987"],
    ["osm_relation_42", "relation/42"],
  ])("opens the remove form with the target for %s", async (id, target) => {
    render(<FacilityPopupContent feature={feature(id)} />);
    await userEvent.click(screen.getByRole("button", { name: REMOVE_LABEL }));

    expect(useLocationStore.getState().correctionMode).toBe("removing");
    expect(useLocationStore.getState().correctionRemoveTarget).toEqual({
      targetOsmId: target,
      facilityType: "restaurants",
      lat: -36.8,
      lon: 174.7,
      name: "Corner Cafe",
    });
  });
});
