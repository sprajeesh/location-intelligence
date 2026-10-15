import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import en from "@/i18n/en.json";
import { useLocationStore } from "@/store";
import type { MapCorrectionOutcome } from "@/hooks/useMapCorrection";
import { MapCorrectionContainer } from "./MapCorrectionContainer";

jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => {
    const raw = key.split(".").reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      (en as Record<string, unknown>)[ns],
    );
    return values ? `${raw}|${JSON.stringify(values)}` : raw;
  },
}));

const submitMock = jest.fn<Promise<MapCorrectionOutcome>, [unknown]>();
jest.mock("@/hooks/useMapCorrection", () => ({
  useMapCorrection: () => ({ submit: submitMock }),
}));

jest.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [
      { id: "restaurants", label: "Restaurants", implemented: true },
      { id: "pharmacies", label: "Pharmacies", implemented: false },
      { id: "schools", label: "Schools", implemented: true },
    ],
    isLoading: false,
    isError: false,
  }),
}));

const POINT = { lat: -36.848, lon: 174.763 };

beforeEach(() => {
  submitMock.mockReset();
  submitMock.mockResolvedValue({ kind: "pending" });
  useLocationStore.setState({ correctionMode: "off", correctionPoint: null, correctionRemoveTarget: null });
});

function openAdd() {
  useLocationStore.setState({ correctionMode: "adding", correctionPoint: POINT });
  return render(<MapCorrectionContainer />);
}

function openRemove() {
  useLocationStore.setState({
    correctionMode: "removing",
    correctionRemoveTarget: { targetOsmId: "node/12345", name: "Corner Cafe" },
  });
  return render(<MapCorrectionContainer />);
}

describe("MapCorrectionForm", () => {
  it("renders nothing when no correction is in progress", () => {
    const { container } = render(<MapCorrectionContainer />);
    expect(container).toBeEmptyDOMElement();
  });

  describe("add", () => {
    it("lists only implemented facility types and does not show the coordinates", () => {
      openAdd();
      const select = screen.getByLabelText(/Type of place/) as HTMLSelectElement;
      const options = within(select).getAllByRole("option").map((o) => o.textContent);
      expect(options).toEqual(["Choose a type", "Restaurants", "Schools"]);
      expect(screen.queryByText(/-36\.84800/)).not.toBeInTheDocument();
    });

    it("blocks submit and shows an inline error when the name is over 200 characters", async () => {
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.click(screen.getByLabelText(/Name/));
      await userEvent.paste("a".repeat(201));
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      expect(screen.getByText(en.mapCorrection.errors.nameTooLong)).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/)).toHaveAttribute("aria-describedby", "mc-name-error");
      expect(submitMock).not.toHaveBeenCalled();
    });

    it("blocks submit and shows an inline error for a malformed email", async () => {
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.type(screen.getByLabelText(/Email/), "not-an-email");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      expect(screen.getByText(en.mapCorrection.errors.emailInvalid)).toBeInTheDocument();
      expect(submitMock).not.toHaveBeenCalled();
    });

    it("requires a facility type", async () => {
      openAdd();
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));
      expect(screen.getByText(en.mapCorrection.errors.facilityTypeRequired)).toBeInTheDocument();
      expect(submitMock).not.toHaveBeenCalled();
    });

    it("sends the add payload, leaving out blank optional fields", async () => {
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.type(screen.getByLabelText(/Name/), "  New Noodle Bar ");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
      expect(submitMock.mock.calls[0]?.[0]).toEqual({
        correctionType: "add",
        facilityType: "restaurants",
        lat: POINT.lat,
        lon: POINT.lon,
        name: "New Noodle Bar",
        website: "",
      });
    });

    it("sends the email when given", async () => {
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "schools");
      await userEvent.type(screen.getByLabelText(/Email/), "person@example.com");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
      expect(submitMock.mock.calls[0]?.[0]).toMatchObject({ reporterEmail: "person@example.com" });
    });

    it("keeps the honeypot out of keyboard and screen reader reach, and sends what a bot filled in", async () => {
      const { container } = openAdd();
      const honeypot = container.querySelector('input[name="website"]') as HTMLInputElement;
      const wrapper = honeypot.closest("[aria-hidden='true']");
      expect(wrapper).toHaveClass("hidden");
      expect(honeypot).toHaveAttribute("tabindex", "-1");

      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.type(honeypot, "https://spam.example");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
      expect(submitMock.mock.calls[0]?.[0]).toMatchObject({ website: "https://spam.example" });
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
    });

    it("shows the field error from a 422 next to that field", async () => {
      submitMock.mockResolvedValue({ kind: "invalid", fieldErrors: ["address"], formError: false });
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      expect(await screen.findByText(en.mapCorrection.errors.invalidField)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address/)).toHaveAttribute("aria-invalid", "true");
    });

    it("shows a form-level message for a 422 that names no field", async () => {
      submitMock.mockResolvedValue({ kind: "invalid", fieldErrors: [], formError: true });
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      expect(await screen.findByText(en.mapCorrection.errors.formGeneric)).toBeInTheDocument();
    });

    it("shows the rate-limit wait in minutes for a 429", async () => {
      submitMock.mockResolvedValue({ kind: "rateLimited", retryAfterSeconds: 150 });
      openAdd();
      await userEvent.selectOptions(screen.getByLabelText(/Type of place/), "restaurants");
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      expect(await screen.findByText(/"minutes":3/)).toBeInTheDocument();
    });
  });

  describe("remove", () => {
    it("names the place and blocks submit until a reason is chosen", async () => {
      openRemove();
      expect(screen.getByText("Corner Cafe")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      expect(screen.getByText(en.mapCorrection.errors.reasonRequired)).toBeInTheDocument();
      expect(submitMock).not.toHaveBeenCalled();
    });

    it("sends the remove payload with the target and reason", async () => {
      openRemove();
      await userEvent.click(screen.getByLabelText(en.mapCorrection.remove.reasons.closed));
      await userEvent.click(screen.getByRole("button", { name: en.mapCorrection.actions.submit }));

      await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
      expect(submitMock.mock.calls[0]?.[0]).toEqual({
        correctionType: "remove",
        targetOsmId: "node/12345",
        reason: "closed",
        website: "",
      });
    });

    it("offers the three reasons", () => {
      openRemove();
      for (const label of [
        en.mapCorrection.remove.reasons.closed,
        en.mapCorrection.remove.reasons.notFound,
        en.mapCorrection.remove.reasons.other,
      ]) {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      }
    });
  });
});
