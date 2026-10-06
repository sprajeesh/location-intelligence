import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileViewToggleContainer } from "./MobileViewToggleContainer";
import { useLocationStore } from "@/store";

jest.mock("@/store");
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const mockUseLocationStore = useLocationStore as unknown as jest.Mock;

const MOCK_ADDRESS = { displayName: "123 Main Street, Auckland", lat: -36.8485, lon: 174.7633 };

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  isMapViewOnMobile: false,
  setIsMapViewOnMobile: jest.fn(),
  isNavigating: false,
  activeRoute: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MobileViewToggleContainer", () => {
  it("renders nothing when no address is selected", () => {
    mockUseLocationStore.mockReturnValue(makeStoreState());
    const { container } = render(<MobileViewToggleContainer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a Map button when results are displayed", () => {
    mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
    render(<MobileViewToggleContainer />);
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
  });

  it("switches to map view when the Map button is clicked", async () => {
    const setIsMapViewOnMobile = jest.fn();
    mockUseLocationStore.mockReturnValue(
      makeStoreState({ selectedAddress: MOCK_ADDRESS, setIsMapViewOnMobile }),
    );
    render(<MobileViewToggleContainer />);
    await userEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(setIsMapViewOnMobile).toHaveBeenCalledWith(true);
  });

  it("shows a Results button when the map is displayed", () => {
    mockUseLocationStore.mockReturnValue(
      makeStoreState({ selectedAddress: MOCK_ADDRESS, isMapViewOnMobile: true }),
    );
    render(<MobileViewToggleContainer />);
    expect(screen.getByRole("button", { name: "Results" })).toBeInTheDocument();
  });

  it("shows a Route button when the map is displayed mid-navigation", () => {
    mockUseLocationStore.mockReturnValue(
      makeStoreState({
        selectedAddress: MOCK_ADDRESS,
        isMapViewOnMobile: true,
        isNavigating: true,
        activeRoute: [[-36.8, 174.7], [-36.81, 174.71]],
      }),
    );
    render(<MobileViewToggleContainer />);
    expect(screen.getByRole("button", { name: "Route" })).toBeInTheDocument();
  });

  it("switches back to the results/map view when clicked", async () => {
    const setIsMapViewOnMobile = jest.fn();
    mockUseLocationStore.mockReturnValue(
      makeStoreState({ selectedAddress: MOCK_ADDRESS, isMapViewOnMobile: true, setIsMapViewOnMobile }),
    );
    render(<MobileViewToggleContainer />);
    await userEvent.click(screen.getByRole("button", { name: "Results" }));
    expect(setIsMapViewOnMobile).toHaveBeenCalledWith(false);
  });
});
