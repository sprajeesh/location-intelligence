import type { Config } from 'tailwindcss'
import { primary, success, warning, error, info, ink } from './src/styles/tokens'

const config: Config = {
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
        primary,
        success,
        warning,
        error,
        info,
        ink,
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
