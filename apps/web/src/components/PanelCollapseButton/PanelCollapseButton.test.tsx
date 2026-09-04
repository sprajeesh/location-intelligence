import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelCollapseButton } from "./PanelCollapseButton";

describe("PanelCollapseButton", () => {
  it("renders close button when panel is expanded on desktop", () => {
    const onToggle = jest.fn();
    render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} isDesktop />
    );

    const button = screen.getByRole("button", { name: /collapse results panel/i });
    expect(button).toBeInTheDocument();
  });

  it("renders open button when panel is collapsed on desktop", () => {
    const onToggle = jest.fn();
    render(
      <PanelCollapseButton isCollapsed={true} onToggle={onToggle} isDesktop />
    );

    const button = screen.getByRole("button", { name: /expand results panel/i });
    expect(button).toBeInTheDocument();
  });

  it("renders close button when panel is expanded on mobile", () => {
    const onToggle = jest.fn();
    render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} isDesktop={false} />
    );

    const button = screen.getByRole("button", { name: /close panel/i });
    expect(button).toBeInTheDocument();
  });

  it("renders open button when panel is collapsed on mobile", () => {
    const onToggle = jest.fn();
    render(
      <PanelCollapseButton isCollapsed={true} onToggle={onToggle} isDesktop={false} />
    );

    const button = screen.getByRole("button", { name: /open panel/i });
    expect(button).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} isDesktop />
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("has different styling for desktop and mobile", () => {
    const onToggle = jest.fn();
    const { container: desktopContainer } = render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} isDesktop />
    );

    const desktopButton = desktopContainer.querySelector("button");
    expect(desktopButton).toHaveClass("fixed", "top-1/2", "rounded-r-md");

    const { container: mobileContainer } = render(
      <PanelCollapseButton isCollapsed={false} onToggle={onToggle} isDesktop={false} />
    );

    const mobileButton = mobileContainer.querySelector("button");
    expect(mobileButton).toHaveClass("absolute", "top-[60vh]", "left-1/2", "rounded-r-md");
  });
});
