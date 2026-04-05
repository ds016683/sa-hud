/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-contrast two-pole system
        // LIGHT SURFACES: near-white backgrounds, near-black text
        'game-dark': '#F5F4F9',         // Page background — very light lavender-white
        'game-darker': '#ECEAF4',       // Slight depth — hover states, subtle sections
        'game-panel': '#FFFFFF',        // Card/panel surface — pure white
        'game-border': '#D4D0E8',       // Border — visible but not heavy
        
        // TEXT on light backgrounds — high contrast darks
        'game-text': '#0D0B1A',         // Primary text — near black
        'game-text-muted': '#1A1730',   // Secondary text — very dark purple-black
        'game-text-dim': '#2D2A45',     // Tertiary text — dark enough to read clearly
        'game-text-subtle': '#4A4568',  // Subtle — still readable (no more light grays)
        
        // ACCENT — violet, used sparingly
        'game-gold': '#6D28D9',         // Primary violet accent
        'game-gold-true': '#F59E0B',    // Gold — Lumen only
        'game-purple': '#6D28D9',
        'game-accent': '#6D28D9',
        'game-accent-light': '#EDE9FE', // Light violet tint for backgrounds
        
        // NAV — stays dark, white text
        'game-nav': '#120F2B',          // Nav — very deep dark purple, almost black
        
        // STATUS
        'game-red': '#DC2626',
        'game-green': '#16A34A',
        'game-blue': '#1E3A8A',
        
        // Stat tiers
        'stat-s-plus': '#DC2626',
        'stat-s': '#EA580C',
        'stat-a-plus': '#D97706',
        'stat-a': '#16A34A',
        'stat-c': '#374151',
        
        // Surface tokens
        'game-surface': '#FFFFFF',
      },
      fontFamily: {
        'game': ['"Cinzel"', 'serif'],
        'mono': ['"Courier New"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(109,40,217,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(109,40,217,0.5)' },
        }
      }
    },
  },
  plugins: [],
}