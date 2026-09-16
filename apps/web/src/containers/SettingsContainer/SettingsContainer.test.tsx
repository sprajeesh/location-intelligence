import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsContainer } from "./SettingsContainer";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryWeights } from "@/hooks/useCategoryWeights";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLocationStore } from "@/store";

jest.mock("@/hooks/useCategories");
jest.mock("@/hooks/useCategoryWeights");
jest.mock("@/hooks/useAnalyze");
jest.mock("@/store");
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const mockUseCategories = useCategories as jest.Mock;
const mockUseCategoryWeights = useCategoryWeights as jest.Mock;
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
  categoryWeights: null,
  setCategoryWeights: jest.fn(),
  selectedAddress: null,
  analysisResult: null,
  radiusKm: 10,
  distanceMode: "driving" as const,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCategories.mockReturnValue({ categories, isLoading: false, isError: false });
  mockUseCategoryWeights.mockReturnValue({
    categoryWeights: { education: 1 },
    isLoading: false,
    isError: false,
  });
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

    it("saves the user's explicit weights even when they coincidentally equal the computed default", async () => {
      // Regression test: Recreation and Food & Drink both default to 0%
      // composite weight, so selecting only these two makes the computed
      // default an even 50/50 split -- identical to what the user is about
      // to enter. Previously this caused categoryWeights to be nulled out,
      // silently dropping the override and leaving the overall score
      // uncalculable (both categories carry 0 weight server-side).
      const categoriesWithRecreationAndFood = [
        { id: "parks", label: "Parks", implemented: true, color: "#22C55E", isDefault: false, compositeCategory: "recreation" },
        { id: "restaurants", label: "Restaurants", implemented: true, color: "#F97316", isDefault: false, compositeCategory: "food_and_drink" },
      ];
      mockUseCategories.mockReturnValue({
        categories: categoriesWithRecreationAndFood,
        isLoading: false,
        isError: false,
      });
      mockUseCategoryWeights.mockReturnValue({
        categoryWeights: { education: 0.4, transport: 0.3, healthcare: 0.2, shopping: 0.1, recreation: 0, food_and_drink: 0 },
        isLoading: false,
        isError: false,
      });
      const setCategoryWeights = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setCategoryWeights }));

      render(<SettingsContainer />);
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));
      await userEvent.click(screen.getByLabelText("Parks"));
      await userEvent.click(screen.getByLabelText("Restaurants"));
      const recreationInput = screen.getByLabelText("recreation weight percent");
      await userEvent.clear(recreationInput);
      await userEvent.type(recreationInput, "50");
      const foodInput = screen.getByLabelText("food_and_drink weight percent");
      await userEvent.clear(foodInput);
      await userEvent.type(foodInput, "50");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(setCategoryWeights).toHaveBeenCalledWith({ recreation: 0.5, food_and_drink: 0.5 });
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

    it("still asks for confirmation when only the category weights changed (no facility change)", async () => {
      const categoriesWithTransport = [
        categories[0],
        {
          id: "bus_stops",
          label: "Bus Stops",
          implemented: true,
          color: "#14B8A6",
          isDefault: true,
          compositeCategory: "transport",
        },
      ];
      mockUseCategories.mockReturnValue({
        categories: categoriesWithTransport,
        isLoading: false,
        isError: false,
      });
      mockUseCategoryWeights.mockReturnValue({
        categoryWeights: { education: 0.5, transport: 0.5 },
        isLoading: false,
        isError: false,
      });
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
      fireEvent.change(screen.getByLabelText("education"), { target: { value: "70" } });
      fireEvent.change(screen.getByLabelText("transport"), { target: { value: "30" } });
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByText(/123 Main Street, Auckland/)).toBeInTheDocument();
      expect(analyze).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Re-analyze" }));
      expect(analyze).toHaveBeenCalledWith(
        expect.objectContaining({ address: MOCK_ADDRESS.displayName }),
      );
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
