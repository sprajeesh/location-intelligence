"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-card">
        {/* From row */}
        <div className="flex items-center gap-2 px-2 py-2">
          <button
            type="button"
            onClick={onBack}
            aria-label={t("back")}
            className="
              flex-shrink-0 w-7 h-7 flex items-center justify-center
              rounded-full text-slate-400
              hover:text-slate-900 hover:bg-slate-100
              active:scale-[0.97] active:bg-slate-200
              transition-all duration-200 ease-out
            "
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
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
            hideClearButton
          />
        </div>

        {/* Connector line */}
        <div className="flex items-center ml-10 mr-3">
          <div className="h-px flex-1 bg-slate-200" />
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
            hideClearButton
          />
        </div>
      </div>
    </div>
  );
}

export default NavigateSearchBar;
