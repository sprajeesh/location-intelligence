"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { AddressSuggestionList, type AddressSuggestionItem } from "@/components/ui/AddressSuggestionList";
import { Input } from "@/components/ui/Input";
import { SURFACE_PANEL_CLASSES } from "@/components/ui/SurfacePanel";
import type { AddressAutocompleteStatus } from "@/hooks/useAddressAutocomplete";

export interface AddressAutocompleteFieldMessages {
  loading: string;
  empty: string;
  error: string;
}

/** The autocomplete state a parent passes in (see useAddressAutocomplete). */
export interface AddressAutocompleteProps {
  isOpen: boolean;
  status: AddressAutocompleteStatus;
  items: AddressSuggestionItem[];
  highlightedIndex: number | null;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onHighlight: (index: number) => void;
  onSelect: (index: number) => void;
}

export interface AddressAutocompleteFieldProps extends AddressAutocompleteProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  messages: AddressAutocompleteFieldMessages;
}

/**
 * Text input with an address suggestion list under it. Holds no logic: state and handlers
 * come from useAddressAutocomplete. The list is in normal flow, not absolutely positioned,
 * so it isn't clipped by a scrolling modal.
 */
export function AddressAutocompleteField({
  id,
  label,
  value,
  placeholder,
  error,
  messages,
  isOpen,
  status,
  items,
  highlightedIndex,
  onChange,
  onKeyDown,
  onBlur,
  onHighlight,
  onSelect,
}: AddressAutocompleteFieldProps) {
  const listId = `${id}-listbox`;
  const errorId = `${id}-error`;
  const showList = isOpen && status !== "idle";
  const activeId =
    highlightedIndex !== null ? items[highlightedIndex]?.id : undefined;

  // Keeps focus in the input while an option is clicked, so the blur doesn't close the list first.
  const keepFocus = (event: FormEvent) => event.preventDefault();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <Input
        id={id}
        size="lg"
        type="text"
        role="combobox"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={activeId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 w-full px-3"
      />

      {showList && (
        <div onMouseDown={keepFocus} className="mt-1">
          <AddressSuggestionList
            id={listId}
            ariaLabel={label}
            items={status === "results" ? items : []}
            highlightedIndex={highlightedIndex}
            onHighlight={onHighlight}
            onSelect={onSelect}
            className={`overflow-hidden ${SURFACE_PANEL_CLASSES.popover}`}
            emptyState={
              status === "error" ? (
                <p className="px-4 py-3 text-sm text-error-600">{messages.error}</p>
              ) : status === "empty" ? (
                <p className="px-4 py-3 text-sm text-slate-500">{messages.empty}</p>
              ) : undefined
            }
            loadingState={
              status === "loading" ? (
                <p className="px-4 py-3 text-sm text-slate-500">{messages.loading}</p>
              ) : undefined
            }
          />
        </div>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-error-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default AddressAutocompleteField;
