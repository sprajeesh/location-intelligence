"use client";

import { useState, type KeyboardEvent } from "react";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import type { AddressResult } from "@/types/api";

/** What the dropdown under an address field should show. */
export type AddressAutocompleteStatus = "idle" | "loading" | "empty" | "error" | "results";

export interface UseAddressAutocompleteOptions {
  /** The field's current text, owned by the caller (e.g. a form's values). */
  value: string;
  onChange: (value: string) => void;
}

export interface UseAddressAutocompleteResult {
  isOpen: boolean;
  status: AddressAutocompleteStatus;
  suggestions: AddressResult[];
  highlightedIndex: number | null;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onHighlight: (index: number) => void;
  onSelect: (index: number) => void;
}

/**
 * Address autocomplete for a controlled text field. Typing runs the same debounced NZ
 * address search as the main search bar. Picking a suggestion writes its display name into
 * the field. Owns the dropdown's open state, highlight and keyboard handling.
 *
 * Escape closes the dropdown without closing the surrounding modal.
 */
export function useAddressAutocomplete({
  value,
  onChange,
}: UseAddressAutocompleteOptions): UseAddressAutocompleteResult {
  const search = useAddressSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const suggestions = search.suggestions;

  let status: AddressAutocompleteStatus = "results";
  if (value.trim().length === 0) status = "idle";
  else if (search.error) status = "error";
  else if (search.isLoading) status = "loading";
  else if (suggestions.length === 0) status = "empty";

  function close() {
    setIsOpen(false);
    setHighlightedIndex(null);
  }

  function select(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    onChange(suggestion.displayName);
    close();
  }

  function handleChange(next: string) {
    onChange(next);
    search.setQuery(next);
    setHighlightedIndex(null);
    setIsOpen(next.trim().length > 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const canNavigate = isOpen && status === "results";
    switch (event.key) {
      case "ArrowDown":
        if (!canNavigate) return;
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, suggestions.length - 1),
        );
        break;
      case "ArrowUp":
        if (!canNavigate) return;
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev === null ? suggestions.length - 1 : Math.max(prev - 1, 0),
        );
        break;
      case "Enter":
        // Only takes the Enter when a suggestion is highlighted; otherwise the form submits.
        if (!canNavigate || highlightedIndex === null) return;
        event.preventDefault();
        select(highlightedIndex);
        break;
      case "Escape":
        if (!isOpen) return;
        // Stops the modal's document-level Escape handler from also closing the form.
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      default:
        break;
    }
  }

  return {
    isOpen,
    status,
    suggestions,
    highlightedIndex,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: close,
    onHighlight: setHighlightedIndex,
    onSelect: select,
  };
}
