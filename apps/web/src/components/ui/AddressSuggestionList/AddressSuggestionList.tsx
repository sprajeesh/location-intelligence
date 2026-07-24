"use client";

import type { ReactNode } from "react";
import { MapPin } from "lucide-react";

export interface AddressSuggestionItem {
  key: string;
  id: string;
  displayName: string;
  sublabel?: ReactNode;
}

export type AddressSuggestionAccent = "emerald" | "rose";

export interface AddressSuggestionListProps {
  id: string;
  ariaLabel?: string;
  items: AddressSuggestionItem[];
  highlightedIndex: number | null;
  onHighlight: (index: number) => void;
  onSelect: (index: number) => void;
  accent?: AddressSuggestionAccent;
  className?: string;
  listClassName?: string;
  iconClassName?: string;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
}

const HIGHLIGHT_CLASSES: Record<AddressSuggestionAccent, string> = {
  emerald: "bg-emerald-500/20 text-emerald-100",
  rose: "bg-rose-500/20 text-rose-100",
};

export function AddressSuggestionList({
  id,
  ariaLabel,
  items,
  highlightedIndex,
  onHighlight,
  onSelect,
  accent = "emerald",
  className = "",
  listClassName = "max-h-60 overflow-y-auto",
  iconClassName = "w-4 h-4 flex-shrink-0 mt-0.5",
  emptyState,
  loadingState,
}: AddressSuggestionListProps) {
  return (
    <div id={id} role="listbox" aria-label={ariaLabel} className={className}>
      {items.length === 0 ? (
        loadingState ?? emptyState ?? null
      ) : (
        <ul role="presentation" className={listClassName}>
          {items.map((item, index) => (
            <li
              key={item.key}
              id={item.id}
              role="option"
              aria-selected={highlightedIndex === index}
              onMouseEnter={() => onHighlight(index)}
              onClick={() => onSelect(index)}
              className={`flex items-start gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 ${
                highlightedIndex === index
                  ? HIGHLIGHT_CLASSES[accent]
                  : "hover:bg-gray-700/50 text-gray-300"
              }`}
            >
              <button type="button" tabIndex={-1} className="flex items-start gap-2 w-full text-left pointer-events-none">
                <MapPin className={iconClassName} aria-hidden="true" />
                {item.sublabel ? (
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.displayName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.sublabel}</p>
                  </div>
                ) : (
                  <span className="truncate">{item.displayName}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressSuggestionList;
