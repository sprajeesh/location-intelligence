import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/i18n/en.json";
import { ContactForm } from "./ContactForm";

// next-intl ships ESM Jest can't load; resolve keys against the real en.json instead.
jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) =>
    key.split(".").reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      (en as Record<string, unknown>)[ns],
    ),
}));

function setup() {
  render(<ContactForm />);
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("ContactForm", () => {
  it("shows errors for the required fields and does not submit", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: en.contact.submit }));
    expect(screen.getByText(en.contact.errors.firstNameRequired)).toBeInTheDocument();
    expect(screen.getByText(en.contact.errors.emailRequired)).toBeInTheDocument();
    expect(screen.getByText(en.contact.errors.messageRequired)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/First name/), "Aroha");
    await userEvent.type(screen.getByLabelText(/Email/), "nope");
    await userEvent.type(screen.getByLabelText(/Share your feedback/), "Hi");
    await userEvent.click(screen.getByRole("button", { name: en.contact.submit }));
    expect(screen.getByText(en.contact.errors.emailInvalid)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the form and confirms on success", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    setup();
    await userEvent.type(screen.getByLabelText(/First name/), "Aroha");
    await userEvent.type(screen.getByLabelText("Last name"), "Ngata");
    await userEvent.type(screen.getByLabelText(/Email/), "a@example.com");
    await userEvent.type(screen.getByLabelText(/Share your feedback/), "Great app");
    await userEvent.click(screen.getByRole("button", { name: en.contact.submit }));

    expect(await screen.findByText(en.contact.success)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(JSON.parse(init.body)).toEqual({
      firstName: "Aroha",
      lastName: "Ngata",
      email: "a@example.com",
      message: "Great app",
    });
  });

  it("shows an error when sending fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    setup();
    await userEvent.type(screen.getByLabelText(/First name/), "Aroha");
    await userEvent.type(screen.getByLabelText(/Email/), "a@example.com");
    await userEvent.type(screen.getByLabelText(/Share your feedback/), "Hi");
    await userEvent.click(screen.getByRole("button", { name: en.contact.submit }));
    await waitFor(() => expect(screen.getByText(en.contact.error)).toBeInTheDocument());
  });
});
