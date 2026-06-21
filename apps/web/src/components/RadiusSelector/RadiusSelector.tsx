'use client';

import React, { useState, useEffect, useRef } from 'react';

const PRESETS = [1, 2, 3, 5];
const isPreset = (v: number) => PRESETS.includes(v);

export interface RadiusSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RadiusSelector({ value, onChange, disabled = false }: RadiusSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(!isPreset(value));
  const [localInput, setLocalInput] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPreset(value)) {
      setLocalInput(String(value));
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
    }
  }, [value]);

  useEffect(() => {
    if (showCustomInput) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [showCustomInput]);

  const handlePreset = (preset: number) => {
    setShowCustomInput(false);
    onChange(preset);
  };

  const handleCustomButtonClick = () => {
    setShowCustomInput(true);
    setLocalInput(String(value));
  };

  const commitCustom = () => {
    const parsed = parseInt(localInput, 10);
    const clamped = isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed));
    setLocalInput(String(clamped));
    onChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCustom();
    }
    if (e.key === 'Escape') {
      setShowCustomInput(false);
    }
  };

  const isCustomActive = showCustomInput;

  const activeClass = 'bg-blue-500/30 text-blue-100 border border-blue-500/50';
  const inactiveClass = 'text-gray-400 hover:text-gray-200';
  const disabledClass = 'opacity-50 cursor-not-allowed';
  const baseButtonClass = 'px-3 py-2 text-sm font-medium rounded transition-all duration-150';

  return (
    <div
      className="inline-flex items-center gap-1 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg p-1 transition-all duration-150 hover:border-gray-600"
      role="group"
      aria-label="Search radius"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset}
          onClick={() => handlePreset(preset)}
          disabled={disabled}
          aria-pressed={!isCustomActive && value === preset}
          className={`${baseButtonClass} ${!isCustomActive && value === preset ? activeClass : inactiveClass} ${disabled ? disabledClass : 'cursor-pointer'}`}
          type="button"
        >
          {preset} km
        </button>
      ))}

      <button
        onClick={handleCustomButtonClick}
        disabled={disabled}
        aria-pressed={isCustomActive}
        className={`${baseButtonClass} ${isCustomActive ? activeClass : inactiveClass} ${disabled ? disabledClass : 'cursor-pointer'}`}
        type="button"
      >
        Custom
      </button>

      {isCustomActive && (
        <div className="flex items-center gap-1 pl-1">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={10}
            step={1}
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Custom radius in kilometres"
            className={`w-12 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-center text-gray-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 ${disabled ? disabledClass : ''}`}
          />
          <span className="text-xs text-gray-400">km</span>
        </div>
      )}
    </div>
  );
}

export default RadiusSelector;
