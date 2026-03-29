/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light SaaS theme — token names preserved for component compatibility
        'game-dark': '#F8F7FF',       // Page background (warm white with violet tint)
        'game-darker': '#F3F0FF',     // Panel hover / subtle bg
        'game-panel': '#FFFFFF',      // Panel/card surface
        'game-border': '#E5E7EB',     // Default border
        'game-gold': '#F59E0B',       // Warm gold accent
        'game-red': '#EF4444',        // Danger
        'game-green': '#10B981',      // Success
        'game-blue': '#2D1B69',       // Primary deep purple
        'game-purple': '#7C3AED',     // Accent violet
        // Stat tier colors (updated for light bg)
        'stat-s-plus': '#DC2626',     // S+: red
        'stat-s': '#EA580C',          // S: orange
        'stat-a-plus': '#D97706',     // A+: amber
        'stat-a': '#16A34A',          // A: green
        'stat-c': '#6B7280',          // C: gray
        // Text system (light theme)
        'game-text': '#0F0A1E',       // Primary text (dark on light bg)
        'game-text-muted': '#4B5563', // Secondary text
        'game-text-dim': '#9CA3AF',   // Muted text
        'game-text-subtle': '#D1D5DB', // Very subtle text
        // New tokens
        'game-surface': '#FFFFFF',    // Card surface
        'game-nav': '#1E1033',        // Nav/sidebar (stays dark)
        'game-accent': '#7C3AED',     // Accent violet
        'game-accent-light': '#EDE9FE', // Light violet bg
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
          '0%, 100%': { boxShadow: '0 0 5px rgba(245,158,11,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(245,158,11,0.5)' },
        }
      }
    },
  },
  plugins: [],
}
