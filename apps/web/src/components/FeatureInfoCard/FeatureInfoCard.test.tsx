import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureInfoCard } from "./FeatureInfoCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

describe("FeatureInfoCard", () => {
  it("renders with a title and close button", () => {
    render(
      <FeatureInfoCard
        title="Test Feature"
        rows={[{ label: "Property", value: "Value" }]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("Test Feature")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("renders all provided rows", () => {
    render(
      <FeatureInfoCard
        title="Feature Details"
        rows={[
          { label: "Field 1", value: "Value 1" },
          { label: "Field 2", value: "Value 2" },
          { label: "Field 3", value: "Value 3" },
        ]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText(/Field 1:/)).toBeInTheDocument();
    expect(screen.getByText("Value 1")).toBeInTheDocument();
    expect(screen.getByText(/Field 2:/)).toBeInTheDocument();
    expect(screen.getByText("Value 2")).toBeInTheDocument();
    expect(screen.getByText(/Field 3:/)).toBeInTheDocument();
    expect(screen.getByText("Value 3")).toBeInTheDocument();
  });

  it("does not render if rows are empty", () => {
    const { container } = render(
      <FeatureInfoCard title="Test Feature" rows={[]} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = jest.fn();
    render(
      <FeatureInfoCard
        title="Feature Details"
        rows={[{ label: "Test", value: "Data" }]}
        onClose={onClose}
      />,
    );
    const closeButton = screen.getByRole("button", { name: /close/i });
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles multiple rows with various content", () => {
    render(
      <FeatureInfoCard
        title="Complex Feature"
        rows={[
          { label: "Name", value: "Example Feature" },
          { label: "Type", value: "Test Type" },
          { label: "Description", value: "A longer description with special chars: & < >" },
          { label: "Code", value: "TEST-123" },
        ]}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText("Example Feature")).toBeInTheDocument();
    expect(screen.getByText(/Type:/)).toBeInTheDocument();
    expect(screen.getByText("Test Type")).toBeInTheDocument();
    expect(screen.getByText(/Description:/)).toBeInTheDocument();
    expect(screen.getByText(/A longer description/)).toBeInTheDocument();
    expect(screen.getByText(/Code:/)).toBeInTheDocument();
    expect(screen.getByText("TEST-123")).toBeInTheDocument();
  });
});
