import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import type { AddressResult } from "@/types/api";
import { useAddressAutocomplete } from "./useAddressAutocomplete";

const mockSearch = {
  query: "",
  setQuery: jest.fn(),
  suggestions: [] as AddressResult[],
  isLoading: false,
  error: null as string | null,
};

jest.mock("@/hooks/useAddressSearch", () => ({
  useAddressSearch: () => mockSearch,
}));

const RESULTS: AddressResult[] = [
  { displayName: "1 Queen Street, Auckland", lat: -36.84, lon: 174.76 },
  { displayName: "2 Queen Street, Auckland", lat: -36.85, lon: 174.77 },
];

function key(k: string) {
  return {
    key: k,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as unknown as KeyboardEvent<HTMLInputElement> & {
    preventDefault: jest.Mock;
    stopPropagation: jest.Mock;
  };
}

beforeEach(() => {
  mockSearch.setQuery.mockReset();
  mockSearch.suggestions = [];
  mockSearch.isLoading = false;
  mockSearch.error = null;
});

describe("useAddressAutocomplete", () => {
  it("writes typed text to the field, runs the search and opens the dropdown", () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useAddressAutocomplete({ value: "", onChange }));

    act(() => result.current.onChange("Queen"));

    expect(onChange).toHaveBeenCalledWith("Queen");
    expect(mockSearch.setQuery).toHaveBeenCalledWith("Queen");
    expect(result.current.isOpen).toBe(true);
  });

  it("stays closed and idle when the text is blank", () => {
    const { result } = renderHook(() => useAddressAutocomplete({ value: "", onChange: jest.fn() }));
    act(() => result.current.onChange("   "));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  it("maps search state to a status", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useAddressAutocomplete({ value, onChange: jest.fn() }),
      { initialProps: { value: "Queen" } },
    );
    expect(result.current.status).toBe("empty");

    mockSearch.suggestions = RESULTS;
    rerender({ value: "Queen" });
    expect(result.current.status).toBe("results");

    mockSearch.isLoading = true;
    rerender({ value: "Queen" });
    expect(result.current.status).toBe("loading");

    mockSearch.isLoading = false;
    mockSearch.error = "boom";
    rerender({ value: "Queen" });
    expect(result.current.status).toBe("error");
  });

  it("moves the highlight with the arrow keys and clamps at both ends", () => {
    mockSearch.suggestions = RESULTS;
    const { result } = renderHook(() =>
      useAddressAutocomplete({ value: "Queen", onChange: jest.fn() }),
    );
    act(() => result.current.onChange("Queen"));

    act(() => result.current.onKeyDown(key("ArrowDown")));
    expect(result.current.highlightedIndex).toBe(0);
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    expect(result.current.highlightedIndex).toBe(1);
    act(() => result.current.onKeyDown(key("ArrowUp")));
    act(() => result.current.onKeyDown(key("ArrowUp")));
    act(() => result.current.onKeyDown(key("ArrowUp")));
    expect(result.current.highlightedIndex).toBe(0);
  });

  it("selects the highlighted suggestion on Enter and closes", () => {
    mockSearch.suggestions = RESULTS;
    const onChange = jest.fn();
    const { result } = renderHook(() => useAddressAutocomplete({ value: "Queen", onChange }));
    act(() => result.current.onChange("Queen"));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.onKeyDown(key("ArrowDown")));

    const enter = key("Enter");
    act(() => result.current.onKeyDown(enter));

    expect(enter.preventDefault).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith("2 Queen Street, Auckland");
    expect(result.current.isOpen).toBe(false);
  });

  it("lets Enter through to the form when nothing is highlighted", () => {
    mockSearch.suggestions = RESULTS;
    const onChange = jest.fn();
    const { result } = renderHook(() => useAddressAutocomplete({ value: "Queen", onChange }));
    act(() => result.current.onChange("Queen"));

    const enter = key("Enter");
    act(() => result.current.onKeyDown(enter));

    expect(enter.preventDefault).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1); // only the typed text, no selection
  });

  it("selects a suggestion directly by index", () => {
    mockSearch.suggestions = RESULTS;
    const onChange = jest.fn();
    const { result } = renderHook(() => useAddressAutocomplete({ value: "Queen", onChange }));
    act(() => result.current.onChange("Queen"));

    act(() => result.current.onSelect(0));

    expect(onChange).toHaveBeenLastCalledWith("1 Queen Street, Auckland");
    expect(result.current.isOpen).toBe(false);
  });

  it("Escape closes the dropdown and stops the event reaching the modal", () => {
    mockSearch.suggestions = RESULTS;
    const { result } = renderHook(() => useAddressAutocomplete({ value: "Queen", onChange: jest.fn() }));
    act(() => result.current.onChange("Queen"));

    const escape = key("Escape");
    act(() => result.current.onKeyDown(escape));

    expect(escape.stopPropagation).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it("Escape with the dropdown already closed is left for the modal", () => {
    const { result } = renderHook(() => useAddressAutocomplete({ value: "", onChange: jest.fn() }));
    const escape = key("Escape");
    act(() => result.current.onKeyDown(escape));
    expect(escape.stopPropagation).not.toHaveBeenCalled();
  });

  it("closes on blur", () => {
    const { result } = renderHook(() => useAddressAutocomplete({ value: "Queen", onChange: jest.fn() }));
    act(() => result.current.onChange("Queen"));
    act(() => result.current.onBlur());
    expect(result.current.isOpen).toBe(false);
  });
});
