import { render, screen } from "@testing-library/react";
import { version } from "../../../package.json";
import { SiteFooter } from "./SiteFooter";

let mockLocale = "en";

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
    const allLinks = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    // Return unique hrefs since both responsive layouts render the same links
    return Array.from(new Set(allLinks));
  };

  it("links to About, FAQ and Data sources without a locale prefix for the default locale", async () => {
    await renderFooter();
    expect(hrefs()).toEqual(["/about", "/faq", "/data-sources"]);
  });

  it("prefixes the links for non-default locales", async () => {
    mockLocale = "mi";
    await renderFooter();
    expect(hrefs()).toEqual(["/mi/about", "/mi/faq", "/mi/data-sources"]);
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
