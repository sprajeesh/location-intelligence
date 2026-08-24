"use client";

export interface WeightSliderProps {
  label: string;
  /** Fraction 0..1 (e.g. 0.4 == 40%). */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * WeightSlider — a single category's weight, meant to sit inline under a
 * category header (the percentage readout lives in the header, not here).
 * Plain range input (no slider library in this app); the filled portion of
 * the track is drawn as a background gradient for a subtle visual cue on
 * drag -- see .animate-slider-fill in globals.css.
 */
export function WeightSlider({ label, value, onChange, disabled = false }: WeightSliderProps) {
  const percent = Math.round(value * 100);

  return (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={percent}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer animate-slider-fill disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: `linear-gradient(to right, var(--slider-fill, #2563eb) ${percent}%, var(--slider-track, #e2e8f0) ${percent}%)`,
      }}
      aria-label={label}
      aria-valuetext={`${percent}%`}
    />
  );
}

export default WeightSlider;
