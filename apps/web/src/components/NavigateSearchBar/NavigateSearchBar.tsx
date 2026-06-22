"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import type { AddressResult } from "@/types/api";

export interface NavigateSearchBarProps {
  fromQuery: string;
  fromSuggestions: AddressResult[];
  fromIsLoading: boolean;
  onFromQueryChange: (value: string) => void;
  onFromSelect: (address: AddressResult) => void;

  toQuery: string;
  toSuggestions: AddressResult[];
  toIsLoading: boolean;
  onToQueryChange: (value: string) => void;
  onToSelect: (address: AddressResult) => void;

  onBack: () => void;
}

type ActiveField = "from" | "to" | null;

export function NavigateSearchBar({
  fromQuery,
  fromSuggestions,
  fromIsLoading,
  onFromQueryChange,
  onFromSelect,
  toQuery,
  toSuggestions,
  toIsLoading,
  onToQueryChange,
  onToSelect,
  onBack,
}: NavigateSearchBarProps) {
  const t = useTranslations("navigate");

  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [fromHighlight, setFromHighlight] = useState<number | null>(null);
  const [toHighlight, setToHighlight] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const fromDropdownId = useId();
  const toDropdownId = useId();

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Reset highlight when suggestions change
  useEffect(() => {
    setFromHighlight(null);
  }, [fromSuggestions]);

  useEffect(() => {
    setToHighlight(null);
  }, [toSuggestions]);

  const showFromDropdown =
    activeField === "from" && fromQuery.trim().length > 0;
  const showToDropdown = activeField === "to" && toQuery.trim().length > 0;

  function handleFromKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showFromDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFromHighlight((p) =>
        p === null ? 0 : Math.min(p + 1, fromSuggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFromHighlight((p) =>
        p === null ? fromSuggestions.length - 1 : Math.max(p - 1, 0),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (fromHighlight !== null && fromSuggestions[fromHighlight]) {
        onFromSelect(fromSuggestions[fromHighlight]);
        setActiveField(null);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setActiveField(null);
    }
  }

  function handleToKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showToDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setToHighlight((p) =>
        p === null ? 0 : Math.min(p + 1, toSuggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setToHighlight((p) =>
        p === null ? toSuggestions.length - 1 : Math.max(p - 1, 0),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (toHighlight !== null && toSuggestions[toHighlight]) {
        onToSelect(toSuggestions[toHighlight]);
        setActiveField(null);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setActiveField(null);
    }
  }

  function selectFrom(address: AddressResult) {
    onFromSelect(address);
    setActiveField(null);
    setFromHighlight(null);
    // Advance focus to the To field
    toInputRef.current?.focus();
  }

  function selectTo(address: AddressResult) {
    onToSelect(address);
    setActiveField(null);
    setToHighlight(null);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Main card ── */}
      <div className="bg-gray-900/85 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-lg overflow-hidden">

        {/* ── From row ── */}
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Back button — lives in this row, left of the source address */}
          <button
            onClick={onBack}
            aria-label={t("back")}
            className="
              flex-shrink-0 w-7 h-7 flex items-center justify-center
              rounded-full text-gray-400
              hover:text-white hover:bg-white/10
              active:scale-95
              transition-all duration-200 ease-out
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50
            "
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
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Origin dot */}
          <span
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-400"
            aria-hidden="true"
          />

          {/* From input */}
          <input
            ref={fromInputRef}
            type="text"
            value={fromQuery}
            onChange={(e) => onFromQueryChange(e.target.value)}
            onFocus={() => setActiveField("from")}
            onKeyDown={handleFromKeyDown}
            placeholder={t("from")}
            aria-label={t("from")}
            aria-autocomplete="list"
            aria-expanded={showFromDropdown}
            aria-controls={fromDropdownId}
            aria-activedescendant={
              fromHighlight !== null
                ? `from-option-${fromHighlight}`
                : undefined
            }
            className="
              flex-1 min-w-0 bg-transparent
              text-sm text-gray-100 placeholder-gray-500
              focus:outline-none
            "
          />

          {fromIsLoading && (
            <div className="flex-shrink-0 w-3.5 h-3.5 border-2 border-gray-600 border-t-emerald-400 rounded-full animate-spin" />
          )}
          {fromQuery && !fromIsLoading && (
            <button
              onClick={() => {
                onFromQueryChange("");
                fromInputRef.current?.focus();
              }}
              className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Clear starting point"
              tabIndex={-1}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Connector line ── */}
        <div className="flex items-center ml-10 mr-3">
          <div className="h-px flex-1 bg-gray-700/50" />
        </div>

        {/* ── To row ── */}
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Spacer matching the back button width */}
          <span className="flex-shrink-0 w-7" aria-hidden="true" />

          {/* Destination dot */}
          <span
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full border-2 border-rose-400"
            aria-hidden="true"
          />

          {/* To input */}
          <input
            ref={toInputRef}
            type="text"
            value={toQuery}
            onChange={(e) => onToQueryChange(e.target.value)}
            onFocus={() => setActiveField("to")}
            onKeyDown={handleToKeyDown}
            placeholder={t("to")}
            aria-label={t("to")}
            aria-autocomplete="list"
            aria-expanded={showToDropdown}
            aria-controls={toDropdownId}
            aria-activedescendant={
              toHighlight !== null ? `to-option-${toHighlight}` : undefined
            }
            className="
              flex-1 min-w-0 bg-transparent
              text-sm text-gray-100 placeholder-gray-500
              focus:outline-none
            "
          />

          {toIsLoading && (
            <div className="flex-shrink-0 w-3.5 h-3.5 border-2 border-gray-600 border-t-rose-400 rounded-full animate-spin" />
          )}
          {toQuery && !toIsLoading && (
            <button
              onClick={() => {
                onToQueryChange("");
                toInputRef.current?.focus();
              }}
              className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Clear destination"
              tabIndex={-1}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── From dropdown ── */}
      {showFromDropdown && (fromSuggestions.length > 0 || fromIsLoading) && (
        <div
          id={fromDropdownId}
          role="listbox"
          aria-label="Starting point suggestions"
          className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {fromSuggestions.length === 0 && fromIsLoading ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {fromSuggestions.map((s, i) => (
                <li key={`${s.lat}-${s.lon}`} role="option" aria-selected={fromHighlight === i}>
                  <button
                    id={`from-option-${i}`}
                    type="button"
                    onMouseEnter={() => setFromHighlight(i)}
                    onClick={() => selectFrom(s)}
                    className={`w-full text-left flex items-start gap-2 px-4 py-2.5 text-sm transition-colors duration-100 ${
                      fromHighlight === i
                        ? "bg-emerald-500/20 text-emerald-100"
                        : "hover:bg-gray-700/50 text-gray-300"
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{s.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── To dropdown ── */}
      {showToDropdown && (toSuggestions.length > 0 || toIsLoading) && (
        <div
          id={toDropdownId}
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {toSuggestions.length === 0 && toIsLoading ? (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {toSuggestions.map((s, i) => (
                <li key={`${s.lat}-${s.lon}`} role="option" aria-selected={toHighlight === i}>
                  <button
                    id={`to-option-${i}`}
                    type="button"
                    onMouseEnter={() => setToHighlight(i)}
                    onClick={() => selectTo(s)}
                    className={`w-full text-left flex items-start gap-2 px-4 py-2.5 text-sm transition-colors duration-100 ${
                      toHighlight === i
                        ? "bg-rose-500/20 text-rose-100"
                        : "hover:bg-gray-700/50 text-gray-300"
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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

export default NavigateSearchBar;
