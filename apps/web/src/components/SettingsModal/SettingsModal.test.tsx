import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "./SettingsModal";
import type { Category } from "@/types/api";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const categories: Category[] = [
  { id: "schools", label: "Schools", implemented: true, color: "#F59E0B", isDefault: true, compositeCategory: "education" },
  { id: "kindergartens", label: "Kindergartens", implemented: true, color: "#FB923C", isDefault: false, compositeCategory: "education" },
  { id: "bus_stops", label: "Bus Stops", implemented: true, color: "#14B8A6", isDefault: true, compositeCategory: "transport" },
];

const sixCategories: Category[] = [
  { id: "f1", label: "F1", implemented: true, color: "#111111", isDefault: true, compositeCategory: "education" },
  { id: "f2", label: "F2", implemented: true, color: "#222222", isDefault: true, compositeCategory: "education" },
  { id: "f3", label: "F3", implemented: true, color: "#333333", isDefault: true, compositeCategory: "transport" },
  { id: "f4", label: "F4", implemented: true, color: "#444444", isDefault: true, compositeCategory: "transport" },
  { id: "f5", label: "F5", implemented: true, color: "#555555", isDefault: true, compositeCategory: "shopping" },
  { id: "f6", label: "F6", implemented: true, color: "#666666", isDefault: false, compositeCategory: "shopping" },
];

const recreationCategories: Category[] = [
  ...categories,
  { id: "parks", label: "Parks", implemented: true, color: "#22C55E", isDefault: false, compositeCategory: "recreation" },
];

const withHealthcare: Category[] = [
  ...categories,
  { id: "clinics", label: "Clinics", implemented: true, color: "#EF4444", isDefault: false, compositeCategory: "healthcare" },
];

const defaultCategoryWeights = {
  education: 0.6,
  transport: 0.4,
  healthcare: 0.2,
  shopping: 0.07,
  recreation: 0,
};

const defaultProps = {
  categories,
  isLoading: false,
  isError: false,
  selectedFacilities: null,
  categoryWeights: null,
  defaultCategoryWeights,
  pendingReanalyze: false,
  address: null,
  onClose: jest.fn(),
  onSave: jest.fn(),
  onConfirmReanalyze: jest.fn(),
  onDismissReanalyze: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SettingsModal", () => {
  describe("Rendering", () => {
    it("renders every facility grouped under its composite category", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByRole("heading", { name: "education" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "transport" })).toBeInTheDocument();
      expect(screen.getByText("Schools")).toBeInTheDocument();
      expect(screen.getByText("Kindergartens")).toBeInTheDocument();
      expect(screen.getByText("Bus Stops")).toBeInTheDocument();
    });

    it("ticks the checkbox for default facilities when nothing is saved yet", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByLabelText("Schools")).toBeChecked();
      expect(screen.getByLabelText("Bus Stops")).toBeChecked();
      expect(screen.getByLabelText("Kindergartens")).not.toBeChecked();
    });

    it("ticks the saved selection instead of the defaults when one exists", () => {
      render(<SettingsModal {...defaultProps} selectedFacilities={["kindergartens"]} />);
      expect(screen.getByLabelText("Kindergartens")).toBeChecked();
      expect(screen.getByLabelText("Schools")).not.toBeChecked();
      expect(screen.getByLabelText("Bus Stops")).not.toBeChecked();
    });

    it("renders checkboxes as interactive, not disabled", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByLabelText("Schools")).not.toBeDisabled();
      expect(screen.getByLabelText("Kindergartens")).not.toBeDisabled();
    });

    it("shows a loading message and no facility groups while loading", () => {
      render(<SettingsModal {...defaultProps} isLoading={true} categories={[]} />);
      expect(screen.getByText("Loading facilities...")).toBeInTheDocument();
      expect(screen.queryByText("Schools")).not.toBeInTheDocument();
    });

    it("shows an error message when the fetch failed", () => {
      render(<SettingsModal {...defaultProps} isError={true} categories={[]} />);
      expect(screen.getByText("Couldn't load facility settings.")).toBeInTheDocument();
    });

    it("shows a help instruction that a max of 5 facilities can be selected", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(
        screen.getByText("Choose up to 5 facilities. Unselect one to choose a different one."),
      ).toBeInTheDocument();
    });

    it("renders a Save button", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });

  describe("Selecting facilities", () => {
    it("toggles a facility on and off", async () => {
      render(<SettingsModal {...defaultProps} />);
      const kindergartens = screen.getByLabelText("Kindergartens");

      await userEvent.click(kindergartens);
      expect(kindergartens).toBeChecked();

      await userEvent.click(kindergartens);
      expect(kindergartens).not.toBeChecked();
    });

    it("allows selecting a different facility after unselecting one at the cap", async () => {
      render(<SettingsModal {...defaultProps} categories={sixCategories} selectedFacilities={["f1", "f2", "f3", "f4", "f5"]} />);

      await userEvent.click(screen.getByLabelText("F1"));
      expect(screen.getByLabelText("F1")).not.toBeChecked();

      await userEvent.click(screen.getByLabelText("F6"));
      expect(screen.getByLabelText("F6")).toBeChecked();
    });

    it("blocks a 6th selection and shows a help text explaining the limit", async () => {
      render(<SettingsModal {...defaultProps} categories={sixCategories} selectedFacilities={["f1", "f2", "f3", "f4", "f5"]} />);

      expect(
        screen.queryByText("You've reached the maximum of 5 facilities. Unselect one first to choose another."),
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByLabelText("F6"));

      expect(screen.getByLabelText("F6")).not.toBeChecked();
      expect(
        screen.getByText("You've reached the maximum of 5 facilities. Unselect one first to choose another."),
      ).toBeInTheDocument();
    });
  });

  describe("Saving", () => {
    it("calls onSave with the current draft selection and active category weights", async () => {
      const onSave = jest.fn();
      render(<SettingsModal {...defaultProps} onSave={onSave} />);

      await userEvent.click(screen.getByLabelText("Kindergartens"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].slice().sort()).toEqual(["bus_stops", "kindergartens", "schools"]);
      expect(onSave.mock.calls[0][1]).toEqual({ education: 0.6, transport: 0.4 });
    });
  });

  describe("Weight sliders", () => {
    it("renders a slider for every category, disabled when it has no selected facility", () => {
      render(<SettingsModal {...defaultProps} categories={recreationCategories} />);
      expect(screen.getByLabelText("education")).toBeInTheDocument();
      expect(screen.getByLabelText("education")).not.toBeDisabled();
      expect(screen.getByLabelText("recreation")).toBeInTheDocument();
      expect(screen.getByLabelText("recreation")).toBeDisabled();
    });

    it("seeds slider values from the DB-configured default ratios, summing to 100 in the footer", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText(/Total Weightage: 100%/)).toBeInTheDocument();
      expect(screen.getByLabelText("education")).toHaveValue("60");
      expect(screen.getByLabelText("transport")).toHaveValue("40");
    });

    it("shows the Recreation slider defaulted to 0% once a recreation facility is checked", async () => {
      render(<SettingsModal {...defaultProps} categories={recreationCategories} />);

      await userEvent.click(screen.getByLabelText("Parks"));

      const recreationSlider = screen.getByLabelText("recreation");
      expect(recreationSlider).not.toBeDisabled();
      expect(recreationSlider).toHaveValue("0");
    });

    it("dragging one slider decreases the others proportionally, keeping the total at 100%", async () => {
      render(<SettingsModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText("education"), { target: { value: "80" } });

      expect(screen.getByLabelText("education")).toHaveValue("80");
      expect(screen.getByLabelText("transport")).toHaveValue("20");
      expect(screen.getByText(/Total Weightage: 100%/)).toBeInTheDocument();
    });

    it("locks the slider at 100% when it's the only active category", async () => {
      render(<SettingsModal {...defaultProps} selectedFacilities={["schools"]} />);

      expect(screen.getByLabelText("education")).toHaveValue("100");
      expect(screen.getByLabelText("education")).toBeDisabled();
    });

    it("borrows proportionally from the current weights (not the DB defaults) when a facility toggle activates a new category", async () => {
      render(<SettingsModal {...defaultProps} categories={withHealthcare} />);

      fireEvent.change(screen.getByLabelText("education"), { target: { value: "80" } });
      expect(screen.getByLabelText("transport")).toHaveValue("20");

      await userEvent.click(screen.getByLabelText("Clinics"));

      // Healthcare borrows out of the current 80/20 split, not the DB
      // defaults (60/40) -- a redistribute, not a reset.
      expect(screen.getByLabelText("education")).toHaveValue("67");
      expect(screen.getByLabelText("transport")).toHaveValue("16");
      expect(screen.getByLabelText("healthcare")).toHaveValue("17");
      expect(screen.getByLabelText("healthcare")).not.toBeDisabled();
      expect(screen.getByText(/Total Weightage: 100%/)).toBeInTheDocument();
    });

    it("returns a deactivated category's weight proportionally to the remaining active categories", async () => {
      render(<SettingsModal {...defaultProps} selectedFacilities={["schools", "bus_stops"]} />);

      await userEvent.click(screen.getByLabelText("Bus Stops"));

      expect(screen.getByLabelText("education")).toHaveValue("100");
      expect(screen.getByLabelText("transport")).toBeDisabled();
      expect(screen.getByText(/Total Weightage: 100%/)).toBeInTheDocument();
    });
  });

  describe("Closing", () => {
    it("calls onClose when the close button is clicked", async () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Re-analyze confirmation", () => {
    it("shows a confirmation message naming the address instead of the facility list", () => {
      render(<SettingsModal {...defaultProps} pendingReanalyze address="123 Main Street" />);
      expect(screen.getByText(/123 Main Street/)).toBeInTheDocument();
      expect(screen.queryByText("Schools")).not.toBeInTheDocument();
    });

    it("calls onConfirmReanalyze when Re-analyze is clicked", async () => {
      const onConfirmReanalyze = jest.fn();
      render(
        <SettingsModal
          {...defaultProps}
          pendingReanalyze
          address="123 Main Street"
          onConfirmReanalyze={onConfirmReanalyze}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Re-analyze" }));
      expect(onConfirmReanalyze).toHaveBeenCalledTimes(1);
    });

    it("calls onDismissReanalyze when Not now is clicked", async () => {
      const onDismissReanalyze = jest.fn();
      render(
        <SettingsModal
          {...defaultProps}
          pendingReanalyze
          address="123 Main Street"
          onDismissReanalyze={onDismissReanalyze}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(onDismissReanalyze).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("exposes a dialog whose aria-labelledby resolves to the modal title", () => {
      render(<SettingsModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      const labelledBy = dialog.getAttribute("aria-labelledby");
      expect(document.getElementById(labelledBy!)).toHaveTextContent("Settings");
    });
  });
});
