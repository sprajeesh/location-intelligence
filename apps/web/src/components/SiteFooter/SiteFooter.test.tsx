import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./SiteFooter";

let mockLocale = "en";

jest.mock("next-intl/server", () => ({
  getLocale: async () => mockLocale,
  getTranslations: async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

async function renderFooter(className?: string) {
  render(await SiteFooter({ className }));
}

describe("SiteFooter", () => {
  beforeEach(() => {
    mockLocale = "en";
  });

  it("links to the data sources page without a locale prefix for the default locale", async () => {
    await renderFooter();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/data-sources");
  });

  it("prefixes the link for non-default locales", async () => {
    mockLocale = "mi";
    await renderFooter();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/mi/data-sources");
  });

  it("renders the link text in the markup (not display:none) so crawlers see it", async () => {
    await renderFooter();
    expect(screen.getByRole("link")).toHaveTextContent("dataSourcesShort");
    expect(screen.getByRole("link")).toHaveTextContent("dataSources");
  });

  it("is a contentinfo landmark and applies extra classes", async () => {
    await renderFooter("mb-14");
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("mb-14");
    expect(footer.className).toContain("bg-primary-600");
  });
});
