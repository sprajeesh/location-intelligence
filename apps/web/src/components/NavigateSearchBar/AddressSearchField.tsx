"use client";

import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { AddressResult } from "@/types/api";
import { AddressSuggestionList } from "@/components/ui/AddressSuggestionList";

interface AddressSearchFieldProps {
  query: string;
  suggestions: AddressResult[];
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (address: AddressResult) => void;
  placeholder: string;
  ariaLabel: string;
  fieldId: "from" | "to";
  accent: "emerald" | "rose";
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onSelectComplete?: () => void;
  hideClearButton?: boolean;
}

const FIELD_LABELS = {
  from: { clearLabel: "Clear starting point", dropdownLabel: "Starting point suggestions" },
  to: { clearLabel: "Clear destination", dropdownLabel: "Destination suggestions" },
} as const;

export function AddressSearchField({
  query,
  suggestions,
  isLoading,
  onQueryChange,
  onSelect,
  placeholder,
  ariaLabel,
  fieldId,
  accent,
  inputRef: externalRef,
  onSelectComplete,
  hideClearButton = false,
}: AddressSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const resolvedRef = externalRef ?? internalRef;

  const { clearLabel, dropdownLabel } = FIELD_LABELS[fieldId];
  const dropdownId = `${fieldId}-dropdown`;
  const inputId = `${fieldId}-address-input`;

  useEffect(() => {
    setHighlight(null);
  }, [suggestions]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const showDropdown = isOpen && query.trim().length > 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((p) => (p === null ? 0 : Math.min(p + 1, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((p) => (p === null ? suggestions.length - 1 : Math.max(p - 1, 0)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight !== null && suggestions[highlight]) {
        handleSelect(suggestions[highlight]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  }

  function handleSelect(address: AddressResult) {
    onSelect(address);
    setIsOpen(false);
    setHighlight(null);
    onSelectComplete?.();
  }

  const dotClass =
    accent === "emerald"
      ? "flex-shrink-0 w-2.5 h-2.5 rounded-full bg-success-500"
      : "flex-shrink-0 w-2.5 h-2.5 rounded-full border-2 border-error-500";

  const spinnerAccent = accent === "emerald" ? "border-t-success-500" : "border-t-error-500";

  return (
    <div ref={wrapperRef} className="flex-1 min-w-0 flex items-center gap-2">
      <span className={dotClass} aria-hidden="true" />
      <label htmlFor={inputId} className="sr-only">
        {ariaLabel}
      </label>
      <input
        id={inputId}
        ref={resolvedRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={dropdownId}
        aria-activedescendant={
          highlight !== null ? `${fieldId}-option-${highlight}` : undefined
        }
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder-slate-400"
      />
      {isLoading && (
        <div
          className={`flex-shrink-0 w-3.5 h-3.5 border-2 border-slate-200 ${spinnerAccent} rounded-full animate-spin`}
        />
      )}
      {query && !isLoading && !hideClearButton && (
        <button
          type="button"
          onClick={() => {
            onQueryChange("");
            resolvedRef.current?.focus();
          }}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors active:scale-[0.97] active:text-slate-700"
          aria-label={clearLabel}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}

      {showDropdown && (suggestions.length > 0 || isLoading) && (
        <AddressSuggestionList
          id={dropdownId}
          ariaLabel={dropdownLabel}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-popover z-50 overflow-hidden"
          listClassName="max-h-56 overflow-y-auto"
          iconClassName="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400"
          items={suggestions.map((s, i) => ({
            key: `${s.lat}-${s.lon}`,
            id: `${fieldId}-option-${i}`,
            displayName: s.displayName,
          }))}
          highlightedIndex={highlight}
          onHighlight={setHighlight}
          onSelect={(i) => {
            const suggestion = suggestions[i];
            if (suggestion) handleSelect(suggestion);
          }}
          accent={accent}
          loadingState={<div className="px-4 py-3 text-sm text-slate-500">Searching…</div>}
        />
      )}
    </div>
  );
}

export default AddressSearchField;
