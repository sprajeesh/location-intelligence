import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/i18n/en.json";
import { CorrectionPlacementHint } from "./CorrectionPlacementHint";

// Resolves dotted namespaces (e.g. "mapCorrection.place") against the real en.json.
jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) =>
    [...ns.split("."), ...key.split(".")].reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      en,
    ),
}));

describe("CorrectionPlacementHint", () => {
  it("shows the placement prompt and both actions", () => {
    render(<CorrectionPlacementHint onUseMapCentre={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(en.mapCorrection.place.hint)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.mapCorrection.place.useCentre })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.mapCorrection.place.cancel })).toBeInTheDocument();
  });

  it("calls onUseMapCentre when Use map centre is clicked", async () => {
    const onUseMapCentre = jest.fn();
    const onCancel = jest.fn();
    render(<CorrectionPlacementHint onUseMapCentre={onUseMapCentre} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.place.useCentre }));
    expect(onUseMapCentre).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  // One click per test: a second userEvent click on the same element in jsdom is treated
  // as a double-click and is swallowed, which says nothing about the component.
  it("calls onCancel when Cancel is clicked", async () => {
    const onUseMapCentre = jest.fn();
    const onCancel = jest.fn();
    render(<CorrectionPlacementHint onUseMapCentre={onUseMapCentre} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.place.cancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onUseMapCentre).not.toHaveBeenCalled();
  });

  it("keeps presses on the hint from starting a map drag", async () => {
    // RTL's container stands in for the Leaflet map element the hint sits inside.
    const { container } = render(
      <CorrectionPlacementHint onUseMapCentre={jest.fn()} onCancel={jest.fn()} />,
    );
    const onMapMouseDown = jest.fn();
    container.addEventListener("mousedown", onMapMouseDown);

    await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.place.cancel }));
    expect(onMapMouseDown).not.toHaveBeenCalled();
  });
});
