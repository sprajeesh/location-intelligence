import type { Config } from 'tailwindcss'
import { primary, success, warning, error } from './src/styles/tokens'

/**
 * Maps a color scale's shade keys (e.g. primary's 50..950) to Tailwind's
 * CSS-variable-with-opacity-support pattern: 'rgb(var(--color-x-500) / <alpha-value>)'.
 * The actual RGB values (light + dark) live in src/i18n/globals.css's :root/.dark
 * blocks -- this only wires up which shades exist, so bg-primary-500/50 etc. keep
 * working with opacity modifiers while resolving to whichever theme is active.
 */
function cssVarScale(name: string, shape: Record<string, unknown>) {
  return Object.fromEntries(
    Object.keys(shape).map((shade) => [shade, `rgb(var(--color-${name}-${shade}) / <alpha-value>)`]),
  )
}

const SLATE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/containers/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
      colors: {
        primary: cssVarScale('primary', primary),
        // info is a deliberate alias of primary (one accent to tune) -- see tokens.ts
        info: cssVarScale('primary', primary),
        success: cssVarScale('success', success),
        warning: cssVarScale('warning', warning),
        error: cssVarScale('error', error),
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        white: 'rgb(var(--color-white) / <alpha-value>)',
        slate: cssVarScale('slate', Object.fromEntries(SLATE_SHADES.map((s) => [s, s]))),
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16,24,40,0.06), 0 1px 3px 0 rgba(16,24,40,0.10)',
        'card-lg': '0 4px 6px -1px rgba(16,24,40,0.08), 0 10px 15px -3px rgba(16,24,40,0.08)',
        popover: '0 4px 6px -1px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
