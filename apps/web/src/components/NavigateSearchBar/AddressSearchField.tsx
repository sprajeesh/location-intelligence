"use client";

import React, { useState, useRef, useEffect } from "react";
import type { AddressResult } from "@/types/api";

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
}: AddressSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const resolvedRef = externalRef ?? internalRef;

  const { clearLabel, dropdownLabel } = FIELD_LABELS[fieldId];
  const dropdownId = `${fieldId}-dropdown`;

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
      ? "flex-shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-400"
      : "flex-shrink-0 w-2.5 h-2.5 rounded-full border-2 border-rose-400";

  const spinnerAccent = accent === "emerald" ? "border-t-emerald-400" : "border-t-rose-400";

  const highlightClass =
    accent === "emerald" ? "bg-emerald-500/20 text-emerald-100" : "bg-rose-500/20 text-rose-100";

  return (
    <div ref={wrapperRef} className="flex-1 min-w-0 flex items-center gap-2">
      <span className={dotClass} aria-hidden="true" />
      <input
        ref={resolvedRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={dropdownId}
        aria-activedescendant={
          highlight !== null ? `${fieldId}-option-${highlight}` : undefined
        }
        className="flex-1 min-w-0 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
      />
      {isLoading && (
        <div
          className={`flex-shrink-0 w-3.5 h-3.5 border-2 border-gray-600 ${spinnerAccent} rounded-full animate-spin`}
        />
      )}
      {query && !isLoading && (
        <button
          onClick={() => {
            onQueryChange("");
            resolvedRef.current?.focus();
          }}
          className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label={clearLabel}
          tabIndex={-1}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {showDropdown && (suggestions.length > 0 || isLoading) && (
        <div
          id={dropdownId}
          role="listbox"
          aria-label={dropdownLabel}
          className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {suggestions.length === 0 && isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li
                  key={`${s.lat}-${s.lon}`}
                  role="option"
                  aria-selected={highlight === i}
                >
                  <button
                    id={`${fieldId}-option-${i}`}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => handleSelect(s)}
                    className={`w-full text-left flex items-start gap-2 px-4 py-2.5 text-sm transition-colors duration-100 ${
                      highlight === i
                        ? highlightClass
                        : "hover:bg-gray-700/50 text-gray-300"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="truncate">{s.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default AddressSearchField;
