import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddressAutocompleteField, type AddressAutocompleteFieldProps } from "./AddressAutocompleteField";

const ITEMS = [
  { key: "a", id: "f-option-0", displayName: "1 Queen Street, Auckland" },
  { key: "b", id: "f-option-1", displayName: "2 Queen Street, Auckland" },
];
const MESSAGES = { loading: "Searching...", empty: "No results found", error: "Something went wrong." };

function setup(overrides: Partial<AddressAutocompleteFieldProps> = {}) {
  const props: AddressAutocompleteFieldProps = {
    id: "f",
    label: "Address of the place (optional)",
    value: "Queen",
    placeholder: "Search a New Zealand address...",
    messages: MESSAGES,
    isOpen: true,
    status: "results",
    items: ITEMS,
    highlightedIndex: null,
    onChange: jest.fn(),
    onKeyDown: jest.fn(),
    onBlur: jest.fn(),
    onHighlight: jest.fn(),
    onSelect: jest.fn(),
    ...overrides,
  };
  render(<AddressAutocompleteField {...props} />);
  return props;
}

describe("AddressAutocompleteField", () => {
  it("is a labelled combobox", () => {
    setup();
    const input = screen.getByRole("combobox", { name: "Address of the place (optional)" });
    expect(input).toHaveValue("Queen");
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("lists the suggestions and reports the pick by index", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("option", { name: "2 Queen Street, Auckland" }));
    expect(props.onSelect).toHaveBeenCalledWith(1);
  });

  it("marks the highlighted suggestion as the active descendant", () => {
    setup({ highlightedIndex: 1 });
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", "f-option-1");
  });

  it("reports typing through onChange", async () => {
    const props = setup({ value: "" });
    await userEvent.type(screen.getByRole("combobox"), "Q");
    expect(props.onChange).toHaveBeenCalledWith("Q");
  });

  it("shows the loading, empty and error messages instead of suggestions", () => {
    const { unmount } = render(
      <AddressAutocompleteField
        id="f" label="L" value="x" placeholder="p" messages={MESSAGES} isOpen status="loading"
        items={[]} highlightedIndex={null} onChange={jest.fn()} onKeyDown={jest.fn()} onBlur={jest.fn()}
        onHighlight={jest.fn()} onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("Searching...")).toBeInTheDocument();
    unmount();

    const { unmount: unmountEmpty } = render(
      <AddressAutocompleteField
        id="f" label="L" value="x" placeholder="p" messages={MESSAGES} isOpen status="empty"
        items={[]} highlightedIndex={null} onChange={jest.fn()} onKeyDown={jest.fn()} onBlur={jest.fn()}
        onHighlight={jest.fn()} onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("No results found")).toBeInTheDocument();
    unmountEmpty();

    render(
      <AddressAutocompleteField
        id="f" label="L" value="x" placeholder="p" messages={MESSAGES} isOpen status="error"
        items={[]} highlightedIndex={null} onChange={jest.fn()} onKeyDown={jest.fn()} onBlur={jest.fn()}
        onHighlight={jest.fn()} onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("shows no list when closed or when the text is blank", () => {
    setup({ isOpen: false });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("links the error message to the input", () => {
    setup({ error: "Keep the address to 300 characters or fewer." });
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "f-error");
  });
});
