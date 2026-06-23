"use client";

import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import type { AddressResult } from "@/types/api";
import { AddressSearchField } from "./AddressSearchField";

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
  const toInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <div className="bg-gray-900/85 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-lg">
        {/* From row */}
        <div className="flex items-center gap-2 px-2 py-2">
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
          <AddressSearchField
            fieldId="from"
            accent="emerald"
            query={fromQuery}
            suggestions={fromSuggestions}
            isLoading={fromIsLoading}
            onQueryChange={onFromQueryChange}
            onSelect={onFromSelect}
            placeholder={t("from")}
            ariaLabel={t("from")}
            onSelectComplete={() => toInputRef.current?.focus()}
          />
        </div>

        {/* Connector line */}
        <div className="flex items-center ml-10 mr-3">
          <div className="h-px flex-1 bg-gray-700/50" />
        </div>

        {/* To row */}
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="flex-shrink-0 w-7" aria-hidden="true" />
          <AddressSearchField
            fieldId="to"
            accent="rose"
            query={toQuery}
            suggestions={toSuggestions}
            isLoading={toIsLoading}
            onQueryChange={onToQueryChange}
            onSelect={onToSelect}
            placeholder={t("to")}
            ariaLabel={t("to")}
            inputRef={toInputRef}
          />
        </div>
      </div>
    </div>
  );
}

export default NavigateSearchBar;
