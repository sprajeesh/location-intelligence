"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocationStore } from "@/store";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import type { AddressResult } from "@/types/api";

/**
 * SearchBar component
 *
 * Floating search input with autocomplete dropdown.
 * Features:
 * - 300ms debounced address search
 * - Shows top 5 suggestions in dropdown
 * - Click to select address → updates store
 * - Click outside to close dropdown
 * - Keyboard navigation (arrow keys, Enter, Escape)
 */

export function SearchBar() {
  const t = useTranslations();
  const { query, setQuery, suggestions, isLoading, error } = useAddressSearch();
  const { selectedAddress, setSelectedAddress } = useLocationStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
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

  // Show/hide dropdown based on suggestions
  useEffect(() => {
    const hasQuery = query.trim().length > 0;
    if (!hasQuery) {
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
    setQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (query.trim() && suggestions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleSelectAddress = (address: AddressResult) => {
    setSelectedAddress(address);
    setQuery(address.displayName);
    setIsDropdownOpen(false);
    setHighlightedIndex(null);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedAddress(null);
    setIsDropdownOpen(false);
    setHighlightedIndex(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, suggestions.length - 1),
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev === null ? suggestions.length - 1 : Math.max(prev - 1, 0),
        );
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (highlightedIndex !== null && suggestions[highlightedIndex]) {
          handleSelectAddress(suggestions[highlightedIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setIsDropdownOpen(false);
        setHighlightedIndex(null);
        break;
      }
      default:
        break;
    }
  };

  const displayValue = selectedAddress?.displayName || query;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search Input Container */}
      <div className="relative flex items-center gap-2">
        {/* Search Icon */}
        <div className="absolute left-3 pointer-events-none flex items-center justify-center">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          aria-label="Search address"
          aria-autocomplete="list"
          aria-expanded={isDropdownOpen}
          aria-controls="search-dropdown"
          className="w-full bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg py-2.5 pl-10 pr-10 text-sm text-gray-100 placeholder-gray-500 transition-all duration-150 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-gray-600"
        />

        {/* Clear/Loading Button */}
        {displayValue && !isLoading && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-1 text-gray-400 hover:text-gray-200 transition-colors duration-150"
            aria-label="Clear search"
            type="button"
          >
            <svg
              className="w-4 h-4"
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

        {isLoading && (
          <div className="absolute right-3 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && (
        <div
          id="search-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
          role="listbox"
        >
          {error ? (
            <div className="px-4 py-3 text-sm text-red-400">
              {t("errors.generic")}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              {query.trim() ? t("search.noResults") : ""}
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.lat}-${suggestion.lon}`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <button
                    onClick={() => handleSelectAddress(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 flex items-start gap-2 ${
                      highlightedIndex === index
                        ? "bg-emerald-500/20 text-emerald-100"
                        : "hover:bg-gray-700/50 text-gray-300"
                    }`}
                    type="button"
                  >
                    {/* Location Icon */}
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
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

                    {/* Address Text */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {suggestion.displayName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {suggestion.lat.toFixed(3)}, {suggestion.lon.toFixed(3)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Loading State Message */}
      {isLoading && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 px-4 py-2.5 text-sm text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg">
          {t("search.loading")}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
