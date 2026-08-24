"use client";

export interface WeightSliderProps {
  label: string;
  /** Integer percent 0-100, already resolved via roundWeightsForDisplay so
   * it always agrees with the percentage shown in the category header. */
  value: number;
  /** Fraction 0..1 (the raw slider position, before display rounding). */
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * WeightSlider — a single category's weight, meant to sit inline under a
 * category header (the percentage readout lives in the header, not here).
 * Plain range input (no slider library in this app); the filled portion of
 * the track is drawn as a background gradient so that auto-balancing
 * (programmatic value changes from other sliders moving) animates smoothly
 * instead of jumping -- see .animate-slider-fill in globals.css.
 */
export function WeightSlider({ label, value, onChange, disabled = false }: WeightSliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer animate-slider-fill disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: `linear-gradient(to right, var(--slider-fill, #2563eb) ${value}%, var(--slider-track, #e2e8f0) ${value}%)`,
      }}
      aria-label={label}
      aria-valuetext={`${value}%`}
    />
  );
}

export default WeightSlider;
