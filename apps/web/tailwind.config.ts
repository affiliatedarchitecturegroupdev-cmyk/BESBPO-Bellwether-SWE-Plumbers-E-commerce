import type { Config } from 'tailwindcss';

// Brand tokens match the corporate site and brand guidelines exactly —
// see /areas/bellwether-swe-plumbers.md for the source palette. Don't
// introduce a second set of "close enough" hex values here; if the palette
// ever changes, it changes in one place and this file picks it up.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0C0E',
        'ink-2': '#12151A',
        hydra: '#0F5C8C',
        cyan: '#29D3C0',
        steel: '#8A9199',
        porcelain: '#F5F6F7',
        'porcelain-dim': '#E7E9EA',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
