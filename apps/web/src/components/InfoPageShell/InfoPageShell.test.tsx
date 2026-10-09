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

describe("InfoPageShell with a hero", () => {
  it("renders the title as the single h1 in the header and keeps main for content", () => {
    render(
      <InfoPageShell locale="en" backHomeLabel="Back" title="Contact Us" subtitle="Say hi">
        <p>Body</p>
      </InfoPageShell>
    );
    const h1 = screen.getByRole("heading", { level: 1, name: "Contact Us" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("banner")).toContainElement(h1);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("link", { name: /Back/ }));
    expect(screen.getByText("Say hi")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Body");
    expect(screen.getByRole("main")).not.toContainElement(h1);
  });
});
