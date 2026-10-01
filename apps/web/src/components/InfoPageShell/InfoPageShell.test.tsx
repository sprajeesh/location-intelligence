import { render, screen } from "@testing-library/react";
import { InfoPageShell } from "./InfoPageShell";

jest.mock("@/components/SiteFooter", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

describe("InfoPageShell", () => {
  it("renders children inside main with a locale-aware back link and the footer", () => {
    render(
      <InfoPageShell locale="mi" backHomeLabel="Back">
        <h1>Title</h1>
      </InfoPageShell>
    );
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Title" }));
    expect(screen.getByRole("link", { name: /Back/ })).toHaveAttribute("href", "/mi");
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toContainElement(screen.getByTestId("site-footer"));
  });
});
