/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light SaaS theme - token names preserved for component compatibility
        'game-dark': '#F8F7FF',       // Page background (warm white with violet tint)
        'game-darker': '#F3F0FF',     // Panel hover / subtle bg
        'game-panel': '#FFFFFF',      // Panel/card surface
        'game-border': '#E5E7EB',     // Default border
        'game-gold': '#7C3AED',       // Violet accent (token repurposed)
        'game-gold-true': '#F59E0B',  // True gold - reserved for Lumen/prestige moments only
        'game-red': '#EF4444',        // Danger
        'game-green': '#10B981',      // Success
        'game-blue': '#2D1B69',       // Primary deep purple
        'game-purple': '#7C3AED',     // Accent violet
        // Stat tier colors
        'stat-s-plus': '#DC2626',
        'stat-s': '#EA580C',
        'stat-a-plus': '#D97706',
        'stat-a': '#16A34A',
        'stat-c': '#6B7280',
        // Text system (improved contrast on light violet backgrounds)
        'game-text': '#0F0A1E',       // Primary text - near black
        'game-text-muted': '#1F1635', // Secondary text - dark purple-black (was #4B5563)
        'game-text-dim': '#374151',   // Muted text - dark gray (was #6B7280 - too light)
        'game-text-subtle': '#4B5563', // Subtle text - medium-dark gray (was #9CA3AF - too light)
        // Surface/nav tokens
        'game-surface': '#FFFFFF',
        'game-nav': '#1E1033',        // Nav stays dark
        'game-accent': '#7C3AED',
        'game-accent-light': '#EDE9FE',
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
          '0%, 100%': { boxShadow: '0 0 5px rgba(124,58,237,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(124,58,237,0.5)' },
        }
      }
    },
  },
  plugins: [],
}