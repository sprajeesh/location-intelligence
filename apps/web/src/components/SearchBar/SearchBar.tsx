"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { AddressResult } from "@/types/api";
import { AddressSuggestionList } from "@/components/ui/AddressSuggestionList";

interface SearchBarProps {
  query: string;
  suggestions: AddressResult[];
  isLoading: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onSelectAddress: (address: AddressResult) => void;
  onClear: () => void;
}

export function SearchBar({
  query,
  suggestions,
  isLoading,
  error,
  onQueryChange,
  onSelectAddress,
  onClear,
}: SearchBarProps) {
  const t = useTranslations();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSelectedQueryRef = useRef<string | null>(null);
  const dropdownId = useId();
  const inputId = useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const hasQuery = query.trim().length > 0;
    if (!hasQuery) {
      setIsDropdownOpen(false);
      setHighlightedIndex(null);
      return;
    }
    if (query === lastSelectedQueryRef.current) {
      setIsDropdownOpen(false);
      setHighlightedIndex(null);
      return;
    }
    setIsDropdownOpen(true);
    if (suggestions.length > 0) {
      setHighlightedIndex(null);
    }
  }, [suggestions, query, error, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQueryChange(e.target.value);
  };

  const selectSuggestion = (suggestion: AddressResult) => {
    lastSelectedQueryRef.current = suggestion.displayName;
    onSelectAddress(suggestion);
    setIsDropdownOpen(false);
    setHighlightedIndex(null);
  };

  const handleInputFocus = () => {
    if (query.trim() && suggestions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === "Enter") e.preventDefault();
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, suggestions.length - 1),
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev === null ? suggestions.length - 1 : Math.max(prev - 1, 0),
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex !== null && suggestions[highlightedIndex]) {
          selectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsDropdownOpen(false);
        setHighlightedIndex(null);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative flex items-center gap-2">
        <div className="absolute left-3 pointer-events-none flex items-center justify-center">
          <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
        </div>

        <label htmlFor={inputId} className="sr-only">
          Search address
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          aria-autocomplete="list"
          aria-expanded={isDropdownOpen}
          aria-controls={dropdownId}
          aria-activedescendant={
            highlightedIndex !== null
              ? `search-option-${highlightedIndex}`
              : undefined
          }
          className="w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 hover:border-slate-400 focus-ring-flush"
        />

        {query && !isLoading && (
          <button
            onClick={onClear}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors duration-150 active:scale-[0.97] active:text-slate-700"
            aria-label="Clear search"
            type="button"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {isLoading && (
          <div className="absolute right-3 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isDropdownOpen && (
        <AddressSuggestionList
          id={dropdownId}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-popover z-50 overflow-hidden"
          items={suggestions.map((suggestion, index) => ({
            key: `${suggestion.lat}-${suggestion.lon}`,
            id: `search-option-${index}`,
            displayName: suggestion.displayName,
            sublabel: `${suggestion.lat.toFixed(3)}, ${suggestion.lon.toFixed(3)}`,
          }))}
          highlightedIndex={highlightedIndex}
          onHighlight={setHighlightedIndex}
          onSelect={(index) => {
            const suggestion = suggestions[index];
            if (!suggestion) return;
            selectSuggestion(suggestion);
          }}
          emptyState={
            error ? (
              <div className="px-4 py-3 text-sm text-error-600">{t("errors.generic")}</div>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500">
                {query.trim() ? t("search.noResults") : ""}
              </div>
            )
          }
        />
      )}

      {isLoading && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 px-4 py-2.5 text-sm text-slate-500 bg-white/80 border border-slate-200 rounded-lg">
          {t("search.loading")}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
