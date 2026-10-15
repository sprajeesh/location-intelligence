"use client";

import { useId, type ReactNode } from "react";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export interface RadioGroupProps<T extends string> {
  /** Shared `name` for the radio inputs, so the browser treats them as one group. */
  name: string;
  legend: ReactNode;
  options: readonly RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Shown under the options and linked to the group with `aria-describedby`. */
  error?: string | null;
}

/**
 * A legend and a set of radio buttons in a fieldset. Each label wraps its input, so
 * clicking the text selects the option. Holds no state: the selected value comes in as a prop.
 */
export function RadioGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps<T>) {
  const errorId = useId();

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium text-ink mb-2">{legend}</legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-primary-600"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-error-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default RadioGroup;
