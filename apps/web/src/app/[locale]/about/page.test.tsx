import { render, screen } from "@testing-library/react";
import en from "@/i18n/en.json";
import AboutPage from "./page";

jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => {
    const value = (en.about as Record<string, unknown>)[key];
    if (typeof value !== "string") throw new Error(`missing message about.${key}`);
    return value;
  },
}));
jest.mock("@/components/InfoPageShell", () => ({
  InfoPageShell: ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

describe("About page", () => {
  it("has one H1, the section headings and links to the contact page, FAQ and data sources", async () => {
    render(await AboutPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getByRole("link", { name: en.about.feedbackLink })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: en.about.faqLink })).toHaveAttribute("href", "/faq");
    expect(screen.getByRole("link", { name: en.about.dataSourcesLink })).toHaveAttribute("href", "/data-sources");
  });

  it("emits AboutPage JSON-LD with no organisation or person node", async () => {
    const { container } = render(await AboutPage({ params: Promise.resolve({ locale: "en" }) }));
    const data = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(data["@type"]).toBe("AboutPage");
    expect(data.url).toMatch(/\/about$/);
    expect(JSON.stringify(data)).not.toMatch(/Organization|Person|email|telephone/);
  });
});
