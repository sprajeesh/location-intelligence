import { cva } from "class-variance-authority";

/**
 * Shared class-building logic for Button/IconButton -- the single place
 * that maps a variant + active state to brand-token Tailwind classes, so
 * Button and IconButton (and anything else that needs the same toolbar
 * look, e.g. RouteModeSelector) stop hand-duplicating these strings.
 */

export type ButtonVariant =
  | "toolbar"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "plain";

// "tint" is the existing soft/selected toolbar look (bg-primary-50); "solid"
// is a fully-filled active state for segmented controls like
// RouteModeSelector, where the selected option should read as pressed-in
// rather than merely highlighted.
export type ButtonActiveVariant = "tint" | "solid";

export const BUTTON_BASE_CLASSES =
  "transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed";

const TOOLBAR_ACTIVE_TINT =
  "bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200";
const TOOLBAR_ACTIVE_SOLID =
  "bg-primary-600 text-white shadow-sm hover:bg-primary-600 active:bg-primary-700";
const TOOLBAR_INACTIVE =
  "text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200";
const TOOLBAR_INACTIVE_ICON =
  "text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200";

/**
 * Single cva definition for every Button/IconButton color variant. `toolbar`
 * has no static color -- it depends on `active`/`activeVariant`/`iconOnly`
 * too, so its classes are resolved via compoundVariants below instead of
 * the `variant` slot.
 */
export const buttonColorVariants = cva("", {
  variants: {
    variant: {
      primary:
        "bg-primary-600 hover:bg-primary-700 text-white active:bg-primary-800",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-700 active:bg-slate-300",
      outline:
        "border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200",
      destructive:
        "bg-error-600 hover:bg-error-700 text-white active:bg-error-800",
      // No color classes at all -- for callers (e.g. Toast) that need the
      // standard shape/interaction affordances but supply their own color
      // via className.
      plain: "",
      toolbar: "",
    },
    active: {
      true: "",
      false: "",
    },
    activeVariant: {
      tint: "",
      solid: "",
    },
    iconOnly: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    {
      variant: "toolbar",
      active: true,
      activeVariant: "solid",
      class: TOOLBAR_ACTIVE_SOLID,
    },
    {
      variant: "toolbar",
      active: true,
      activeVariant: "tint",
      class: TOOLBAR_ACTIVE_TINT,
    },
    {
      variant: "toolbar",
      active: false,
      iconOnly: true,
      class: TOOLBAR_INACTIVE_ICON,
    },
    {
      variant: "toolbar",
      active: false,
      iconOnly: false,
      class: TOOLBAR_INACTIVE,
    },
  ],
  defaultVariants: {
    variant: "toolbar",
    active: false,
    activeVariant: "tint",
    iconOnly: false,
  },
});

/**
 * `outline` is border-based, so its focus ring should sit flush against
 * that border instead of the inset ring used by borderless controls -- see
 * .focus-ring-flush / .focus-ring-inset in globals.css.
 */
export function getFocusRingClass(variant: ButtonVariant): string {
  return variant === "outline" ? "focus-ring-flush" : "focus-ring-inset";
}

// The "marker visibility" eye-icon toggle (on/off state for a map marker)
// used identically by CategoryScoreCard, FacilityScoreRow, and FacilityItem --
// centralized here so those three stop hand-copying the same two strings.
const VISIBILITY_TOGGLE_ACTIVE =
  "text-primary-600 hover:text-primary-700 hover:bg-primary-50";
const VISIBILITY_TOGGLE_INACTIVE =
  "text-slate-400 hover:text-slate-500 hover:bg-slate-100";

export function getVisibilityToggleClasses(isVisible: boolean): string {
  return isVisible ? VISIBILITY_TOGGLE_ACTIVE : VISIBILITY_TOGGLE_INACTIVE;
}
