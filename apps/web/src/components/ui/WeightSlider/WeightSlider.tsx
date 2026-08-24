"use client";

export interface WeightSliderProps {
  label: string;
  /** Fraction 0..1 (e.g. 0.4 == 40%). */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * WeightSlider — a single category's weight, 0-100%. Plain range input (no
 * slider library in this app) with a live percentage readout and a subtle
 * grow-on-drag thumb animation (see .animate-slider-thumb in globals.css).
 */
export function WeightSlider({ label, value, onChange, disabled = false }: WeightSliderProps) {
  const percent = Math.round(value * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{percent}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-primary-600 animate-slider-thumb transition-smooth"
        aria-label={label}
        aria-valuetext={`${percent}%`}
      />
    </div>
  );
}

export default WeightSlider;
