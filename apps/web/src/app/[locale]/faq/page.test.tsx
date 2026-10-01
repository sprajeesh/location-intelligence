import { render, screen } from "@testing-library/react";
import en from "@/i18n/en.json";
import { FAQ_ITEM_KEYS } from "@/lib/faqItems";
import FaqPage from "./page";

jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => {
    const value = key.split(".").reduce<any>((o, k) => o?.[k], en.faq);
    if (typeof value !== "string") throw new Error(`missing message faq.${key}`);
    return value;
  },
}));
jest.mock("@/components/InfoPageShell", () => ({
  InfoPageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

async function renderPage() {
  const { container } = render(await FaqPage({ params: Promise.resolve({ locale: "en" }) }));
  return container;
}

describe("FAQ page", () => {
  it("has a single H1 and one visible H2 per question", async () => {
    await renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(FAQ_ITEM_KEYS.length);
  });

  it("emits FAQPage JSON-LD whose questions and answers all appear on the page", async () => {
    const container = await renderPage();
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(FAQ_ITEM_KEYS.length);
    for (const q of data.mainEntity) {
      expect(screen.getByText(q.name)).toBeInTheDocument();
      expect(screen.getByText(q.acceptedAnswer.text)).toBeInTheDocument();
    }
  });
});
