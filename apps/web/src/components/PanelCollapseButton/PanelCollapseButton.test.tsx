import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelCollapseButton } from "./PanelCollapseButton";

describe("PanelCollapseButton", () => {
  it("renders close button when panel is expanded", () => {
    const onToggle = jest.fn();
    render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} />
    );

    const button = screen.getByRole("button", { name: /collapse results panel/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("renders open button when panel is collapsed", () => {
    const onToggle = jest.fn();
    render(
      <PanelCollapseButton isCollapsed={true} onToggle={onToggle} />
    );

    const button = screen.getByRole("button", { name: /expand results panel/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} />
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("has desktop-only styling with responsive positioning", () => {
    const onToggle = jest.fn();
    const { container } = render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} />
    );

    const button = container.querySelector("button");
    expect(button).toHaveClass("hidden", "md:flex", "fixed", "top-1/2", "rounded-r-md");
  });
});
