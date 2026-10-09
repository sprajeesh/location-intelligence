import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageSwitcher } from "./LanguageSwitcher";

let mockPathname = "/about";

jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

function setup(locale = "en") {
  render(<LanguageSwitcher locale={locale} label="Language" />);
  return screen.getByRole("button", { name: "Language" });
}

const menuLinks = () =>
  screen.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")]);

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    mockPathname = "/about";
  });

  it("shows the current locale on the trigger, collapsed by default", () => {
    const trigger = setup("mi");
    expect(trigger).toHaveTextContent("MI");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles aria-expanded when the trigger is clicked", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("lists EN and MI links for the current page", () => {
    setup();
    expect(menuLinks()).toEqual([
      ["EN", "/about"],
      ["MI", "/mi/about"],
    ]);
  });

  it("strips the current locale prefix before building links", () => {
    mockPathname = "/mi/faq";
    setup("mi");
    expect(menuLinks()).toEqual([
      ["EN", "/faq"],
      ["MI", "/mi/faq"],
    ]);
  });

  it("links to the locale home from a bare locale path and from the root", () => {
    mockPathname = "/mi";
    const { unmount } = render(<LanguageSwitcher locale="mi" label="Language" />);
    expect(menuLinks()).toEqual([
      ["EN", "/"],
      ["MI", "/mi"],
    ]);
    unmount();
    mockPathname = "/";
    render(<LanguageSwitcher locale="en" label="Language" />);
    expect(menuLinks()).toEqual([
      ["EN", "/"],
      ["MI", "/mi"],
    ]);
  });

  it("marks only the current locale link with aria-current", () => {
    setup("mi");
    const current = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "true");
    expect(current.map((l) => l.textContent)).toEqual(["MI"]);
  });

  it("sets lang and hreflang on each link", () => {
    setup();
    const [en, mi] = screen.getAllByRole("link");
    expect(en).toHaveAttribute("hreflang", "en");
    expect(mi).toHaveAttribute("lang", "mi");
  });

  it("closes when Escape is pressed", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when clicking outside but not when clicking inside", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    fireEvent.pointerDown(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes after a language link is chosen", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("link", { name: "MI" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
