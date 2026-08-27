"use client";

import { useEffect, useRef, useState } from "react";
import { weightToPercent } from "@/utils/facilitySelection";

export interface WeightSliderProps {
  label: string;
  /** Fraction 0..1 (e.g. 0.4 == 40%). */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const REVEAL_DURATION_MS = 450;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * WeightSlider — a single category's weight, meant to sit inline under a
 * category header (the percentage readout lives in the header, not here).
 * Plain range input (no slider library in this app); the filled portion of
 * the track is drawn as a background gradient for a subtle visual cue on
 * drag -- see .animate-slider-fill in globals.css. Renders (and reports)
 * the weight to 2 decimal places of percent -- see weightToPercent -- so a
 * DB-configured ratio like 0.4124 shows as 41.24%, not a lossy 41%.
 *
 * On mount (or whenever the category becomes active/enabled), the slider
 * fill animates smoothly from 0 to the target weight over 450ms with an
 * ease-out curve, giving the panel a polished feel on open. The animation
 * is driven by requestAnimationFrame and respects prefers-reduced-motion.
 * User interaction (drag, arrow keys) immediately stops the animation and
 * takes over the value.
 */
export function WeightSlider({ label, value, onChange, disabled = false }: WeightSliderProps) {
  const percent = weightToPercent(value);

  const [displayPercent, setDisplayPercent] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const hasAnimatedRef = useRef(false);
  const isInteractingRef = useRef(false);

  const handleInteractionStart = () => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;
    setIsRevealing(false);
  };

  useEffect(() => {
    if (disabled) {
      setDisplayPercent(0);
      return;
    }

    if (hasAnimatedRef.current || isInteractingRef.current) {
      setDisplayPercent(percent);
      return;
    }

    hasAnimatedRef.current = true;

    if (percent <= 0 || prefersReducedMotion()) {
      setDisplayPercent(percent);
      return;
    }

    setIsRevealing(true);
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      if (isInteractingRef.current) return;
      const t = Math.min((now - start) / REVEAL_DURATION_MS, 1);
      setDisplayPercent(percent * easeOutCubic(t));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setIsRevealing(false);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [disabled, percent]);

  return (
    <input
      type="range"
      min={0}
      max={100}
      step={0.01}
      value={displayPercent}
      disabled={disabled}
      onPointerDown={handleInteractionStart}
      onKeyDown={handleInteractionStart}
      onChange={(e) => {
        handleInteractionStart();
        const next = Number(e.target.value);
        setDisplayPercent(next);
        onChange(next / 100);
      }}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer animate-slider-fill disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: `linear-gradient(to right, rgb(var(--color-primary-600)) ${displayPercent}%, rgb(var(--color-slate-200)) ${displayPercent}%)`,
        transition: isRevealing ? "none" : undefined,
      }}
      aria-label={label}
      aria-valuetext={`${percent}%`}
    />
  );
}

export default WeightSlider;
