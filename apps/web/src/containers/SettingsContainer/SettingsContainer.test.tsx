import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsContainer } from "./SettingsContainer";
import { useCategories } from "@/hooks/useCategories";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLocationStore } from "@/store";

jest.mock("@/hooks/useCategories");
jest.mock("@/hooks/useAnalyze");
jest.mock("@/store");
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const mockUseCategories = useCategories as jest.Mock;
const mockUseAnalyze = useAnalyze as jest.Mock;
const mockUseLocationStore = useLocationStore as unknown as jest.Mock;

const categories = [
  {
    id: "schools",
    label: "Schools",
    implemented: true,
    color: "#F59E0B",
    isDefault: true,
    compositeCategory: "education",
  },
  {
    id: "kindergartens",
    label: "Kindergartens",
    implemented: true,
    color: "#FB923C",
    isDefault: false,
    compositeCategory: "education",
  },
];

const MOCK_ADDRESS = {
  displayName: "123 Main Street, Auckland",
  lat: -36.8485,
  lon: 174.7633,
};

const makeStoreState = (overrides = {}) => ({
  selectedFacilities: null,
  setSelectedFacilities: jest.fn(),
  selectedAddress: null,
  analysisResult: null,
  radiusKm: 10,
  distanceMode: "driving" as const,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCategories.mockReturnValue({ categories, isLoading: false, isError: false });
  mockUseAnalyze.mockReturnValue({ mutate: jest.fn() });
  mockUseLocationStore.mockReturnValue(makeStoreState());
});

describe("SettingsContainer", () => {
  it("renders the Settings gear button", () => {
    render(<SettingsContainer />);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("fetches categories on mount", () => {
    render(<SettingsContainer />);
    expect(mockUseCategories).toHaveBeenCalled();
  });

  it("does not render the modal initially", () => {
    render(<SettingsContainer />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the modal when the gear button is clicked", async () => {
    render(<SettingsContainer />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Schools")).toBeInTheDocument();
  });

  it("closes the modal when the modal's close button is clicked, discarding unsaved changes", async () => {
    const setSelectedFacilities = jest.fn();
    mockUseLocationStore.mockReturnValue(makeStoreState({ setSelectedFacilities }));

    render(<SettingsContainer />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.click(screen.getByLabelText("Kindergartens"));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(setSelectedFacilities).not.toHaveBeenCalled();
  });

  describe("Save", () => {
    it("commits the selection to the store and closes when there is no analyzed address", async () => {
      const setSelectedFacilities = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setSelectedFacilities }));

      render(<SettingsContainer />);
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));
      await userEvent.click(screen.getByLabelText("Kindergartens"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(setSelectedFacilities).toHaveBeenCalledWith(
        expect.arrayContaining(["schools", "kindergartens"]),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("saves null when the draft matches the DB defaults, so the API keeps using its own default set", async () => {
      const setSelectedFacilities = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ setSelectedFacilities, selectedFacilities: ["kindergartens"] }),
      );

      render(<SettingsContainer />);
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));
      // Draft seeds from the saved selection (kindergartens); toggle back to the defaults.
      await userEvent.click(screen.getByLabelText("Kindergartens"));
      await userEvent.click(screen.getByLabelText("Schools"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(setSelectedFacilities).toHaveBeenCalledWith(null);
    });

    it("asks for confirmation before re-analyzing when an address is already analyzed and the selection changed", async () => {
      const setSelectedFacilities = jest.fn();
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze });
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          setSelectedFacilities,
          selectedAddress: MOCK_ADDRESS,
          analysisResult: { location: {}, features: [], score: {}, warnings: [] },
        }),
      );

      render(<SettingsContainer />);
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));
      await userEvent.click(screen.getByLabelText("Kindergartens"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(setSelectedFacilities).toHaveBeenCalled();
      expect(screen.getByText(/123 Main Street, Auckland/)).toBeInTheDocument();
      expect(analyze).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Re-analyze" }));
      expect(analyze).toHaveBeenCalledWith(
        expect.objectContaining({ address: MOCK_ADDRESS.displayName, radiusKm: 10, distanceMode: "driving" }),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not ask for confirmation when the selection did not change", async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze });
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: MOCK_ADDRESS,
          analysisResult: { location: {}, features: [], score: {}, warnings: [] },
        }),
      );

      render(<SettingsContainer />);
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(analyze).not.toHaveBeenCalled();
    });

    it("closes without re-analyzing when Not now is clicked", async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze });
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: MOCK_ADDRESS,
          analysisResult: { location: {}, features: [], score: {}, warnings: [] },
        }),
      );

      render(<SettingsContainer />);
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));
      await userEvent.click(screen.getByLabelText("Kindergartens"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      await userEvent.click(screen.getByRole("button", { name: "Not now" }));

      expect(analyze).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
