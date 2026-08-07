import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsContainer } from "./SettingsContainer";
import { useCategories } from "@/hooks/useCategories";

jest.mock("@/hooks/useCategories");
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const mockUseCategories = useCategories as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCategories.mockReturnValue({
    categories: [
      {
        id: "schools",
        label: "Schools",
        implemented: true,
        color: "#F59E0B",
        isDefault: true,
        compositeCategory: "education",
      },
    ],
    isLoading: false,
    isError: false,
  });
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

  it("closes the modal when the modal's close button is clicked", async () => {
    render(<SettingsContainer />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
