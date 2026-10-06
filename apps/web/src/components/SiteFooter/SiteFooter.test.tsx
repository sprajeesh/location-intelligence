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

  const hrefs = () =>
    screen.getAllByRole("link").map((l) => l.getAttribute("href"));

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
    const dataLink = screen.getByRole("link", { name: /dataSources/ });
    expect(dataLink).toHaveTextContent("dataSourcesShort");
    expect(dataLink).toHaveTextContent("dataSources");
  });

  it("shows the app version from package.json", async () => {
    await renderFooter();
    expect(screen.getByText(`v${version}`)).toBeInTheDocument();
  });

  it("suffixes the commit hash when one is provided (dev)", async () => {
    process.env.APP_DEV_COMMIT = "abc1234";
    try {
      await renderFooter();
      expect(screen.getByText(`v${version}+abc1234`)).toBeInTheDocument();
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
