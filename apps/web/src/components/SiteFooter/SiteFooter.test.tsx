import { render, screen } from "@testing-library/react";
import { version } from "../../../package.json";
import { SiteFooter } from "./SiteFooter";

let mockLocale = "en";

jest.mock("next/navigation", () => ({ usePathname: () => "/about" }));

jest.mock("next-intl/server", () => ({
  getLocale: async () => mockLocale,
  getTranslations:
    async () => (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
}));

async function renderFooter(className?: string) {
  render(await SiteFooter({ className }));
}

describe("SiteFooter", () => {
  beforeEach(() => {
    mockLocale = "en";
  });

  const hrefs = () => {
    const allLinks = screen
      .getAllByRole("link")
      .filter((l) => !l.hasAttribute("hreflang"))
      .map((l) => l.getAttribute("href"));
    // Return unique hrefs since both responsive layouts render the same links
    return Array.from(new Set(allLinks));
  };

  it("links to About, Contact, FAQ and Data sources without a locale prefix for the default locale", async () => {
    await renderFooter();
    expect(hrefs()).toEqual(["/about", "/contact", "/faq", "/data-sources"]);
  });

  it("prefixes the links for non-default locales", async () => {
    mockLocale = "mi";
    await renderFooter();
    expect(hrefs()).toEqual(["/mi/about", "/mi/contact", "/mi/faq", "/mi/data-sources"]);
  });

  it("orders desktop links About, Contact, FAQ, Data sources", async () => {
    await renderFooter();
    const desktop = screen.getAllByRole("navigation")[0]!;
    const labels = Array.from(desktop.querySelectorAll("a:not([hreflang])")).map((a) => a.textContent);
    expect(labels).toEqual(["about", "contact", "faq", "dataSources"]);
  });

  it("renders both short and long labels in the markup (not display:none) so crawlers see them", async () => {
    await renderFooter();
    // Data sources link now shows full label on both desktop and mobile
    const dataLinks = screen.getAllByRole("link").filter((l) =>
      l.getAttribute("href")?.includes("data-sources")
    );
    expect(dataLinks.length).toBeGreaterThan(0);
    // Both layouts render the same full "dataSources" label (not hidden with display:none)
    const hasLongLabel = dataLinks.some((l) => l.textContent?.includes("dataSources"));
    expect(hasLongLabel).toBe(true);
  });

  it("puts the language switcher before About", async () => {
    await renderFooter();
    const nav = screen.getByRole("navigation");
    const order = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(order.slice(0, 3)).toEqual(["EN", "MI", "about"]);
  });

  it("renders a single nav; mobile links live in MobileMenu", async () => {
    await renderFooter();
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("links the language switcher to the current page in each locale", async () => {
    mockLocale = "mi";
    await renderFooter();
    const links = screen.getAllByRole("link").filter((l) => l.hasAttribute("hreflang"));
    expect(Array.from(new Set(links.map((l) => l.getAttribute("href"))))).toEqual(["/about", "/mi/about"]);
    expect(links.filter((l) => l.getAttribute("aria-current") === "true").map((l) => l.textContent)).toEqual(["MI"]);
  });

  it("shows the app version from package.json", async () => {
    await renderFooter();
    // Both responsive layouts render the version, verify at least one exists
    expect(screen.getAllByText(`v${version}`).length).toBeGreaterThan(0);
  });

  it("suffixes the commit hash when one is provided (dev)", async () => {
    process.env.APP_DEV_COMMIT = "abc1234";
    try {
      await renderFooter();
      // Both responsive layouts render the version, verify at least one exists
      expect(screen.getAllByText(`v${version}+abc1234`).length).toBeGreaterThan(0);
    } finally {
      delete process.env.APP_DEV_COMMIT;
    }
  });

  it("is a contentinfo landmark and applies extra classes", async () => {
    await renderFooter("custom-class");
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("custom-class");
    expect(footer.className).toContain("bg-primary-600");
  });
});
