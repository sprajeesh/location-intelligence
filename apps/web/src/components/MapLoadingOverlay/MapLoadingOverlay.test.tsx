import { render, screen } from "@testing-library/react";
import { MapLoadingOverlay } from "./MapLoadingOverlay";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("MapLoadingOverlay", () => {
  it("shows the translated analysing label", () => {
    render(<MapLoadingOverlay />);
    expect(screen.getByText("analyze.loading")).toBeInTheDocument();
  });

  it("does not block the map beneath it", () => {
    const { container } = render(<MapLoadingOverlay />);
    expect(container.firstChild).toHaveClass("pointer-events-none");
  });
});
