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

const defaultProps = {
  categories,
  isLoading: false,
  isError: false,
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SettingsModal", () => {
  describe("Rendering", () => {
    it("renders every facility grouped under its composite category", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText("education")).toBeInTheDocument();
      expect(screen.getByText("transport")).toBeInTheDocument();
      expect(screen.getByText("Schools")).toBeInTheDocument();
      expect(screen.getByText("Kindergartens")).toBeInTheDocument();
      expect(screen.getByText("Bus Stops")).toBeInTheDocument();
    });

    it("ticks the checkbox for default facilities and leaves non-defaults unchecked", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByLabelText("Schools")).toBeChecked();
      expect(screen.getByLabelText("Bus Stops")).toBeChecked();
      expect(screen.getByLabelText("Kindergartens")).not.toBeChecked();
    });

    it("renders checkboxes as disabled (read-only)", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByLabelText("Schools")).toBeDisabled();
      expect(screen.getByLabelText("Kindergartens")).toBeDisabled();
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
  });

  describe("Closing", () => {
    it("calls onClose when the close button is clicked", async () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the backdrop is clicked", async () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);
      await userEvent.click(screen.getByRole("dialog").parentElement!.parentElement!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when the panel content is clicked", async () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);
      await userEvent.click(screen.getByText("Schools"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose when Escape is pressed", () => {
      const onClose = jest.fn();
      render(<SettingsModal {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("exposes role=dialog with aria-modal and a matching aria-labelledby title", () => {
      render(<SettingsModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      const labelledBy = dialog.getAttribute("aria-labelledby");
      expect(document.getElementById(labelledBy!)).toHaveTextContent("Settings");
    });
  });
});
