import { render, screen } from "@testing-library/react";
import { ParcelInfoCard } from "./ParcelInfoCard";
import type { ParcelFeature } from "@/types/parcel";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

const makeParcel = (
  overrides: Partial<ParcelFeature["properties"]> = {},
): ParcelFeature => ({
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: {
    id: 1,
    appellation: "Lot 1 DP 123",
    parcel_intent: "Fee Simple",
    titles: "NA1/2",
    land_district: "North Auckland",
    topology_type: "Primary",
    affected_surveys: null,
    statutory_actions: null,
    survey_area: null,
    calc_area: 1000,
    ...overrides,
  },
});

describe("ParcelInfoCard", () => {
  it("shows the property details card with each parcel field", () => {
    render(<ParcelInfoCard feature={makeParcel()} onClose={jest.fn()} />);
    expect(screen.getByText("Property Details")).toBeInTheDocument();
    expect(screen.getByText("Lot 1 DP 123")).toBeInTheDocument();
    expect(screen.getByText("Fee Simple")).toBeInTheDocument();
    expect(screen.getByText("NA1/2")).toBeInTheDocument();
  });

  it("omits fields that are null", () => {
    render(
      <ParcelInfoCard
        feature={makeParcel({ parcel_intent: null, titles: null })}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("Lot 1 DP 123")).toBeInTheDocument();
    expect(screen.queryByText(/Parcel intent/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Title\(s\)/)).not.toBeInTheDocument();
  });
});
