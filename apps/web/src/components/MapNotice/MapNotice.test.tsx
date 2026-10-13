import { render, screen } from "@testing-library/react";
import { MapNotice } from "./MapNotice";

describe("MapNotice", () => {
  it("renders its message inside a status banner", () => {
    render(<MapNotice tone="warning">Heads up</MapNotice>);
    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
  });

  it("renders the supplied icon", () => {
    render(
      <MapNotice tone="neutral" icon={<span data-testid="notice-icon" />}>
        Message
      </MapNotice>,
    );
    expect(screen.getByTestId("notice-icon")).toBeInTheDocument();
  });

  it("is pinned to the top of the map and ignores pointer events", () => {
    const { container } = render(<MapNotice tone="error">Oops</MapNotice>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("absolute", "top-2", "pointer-events-none");
  });

  it("applies the tone's colour classes", () => {
    render(<MapNotice tone="error">Oops</MapNotice>);
    expect(screen.getByRole("status")).toHaveClass("text-error-800");
  });
});
