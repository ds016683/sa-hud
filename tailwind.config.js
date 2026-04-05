/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MMA-inspired palette — clean, professional, high-contrast
        'game-dark': '#F8FAFC',          // Page background — crisp white
        'game-darker': '#F3F6FA',        // Subtle depth — hover, section bg
        'game-panel': '#FFFFFF',         // Card surface — pure white
        'game-border': '#CBD8E8',        // Border — visible, not heavy

        // TEXT — dark navy family, all high contrast on white
        'game-text': '#002C77',          // Primary — dark navy
        'game-text-muted': '#003D9E',    // Secondary — slightly lighter navy
        'game-text-dim': '#1A4080',      // Tertiary — readable navy
        'game-text-subtle': '#2E5FA3',   // Subtle — still clearly readable

        // ACCENTS
        'game-gold': '#009DE0',          // Primary accent — bright blue (replaces violet)
        'game-gold-true': '#FF8C00',     // Orange — urgency, priority high/urgent
        'game-purple': '#009DE0',        // Alias — bright blue
        'game-accent': '#009DE0',        // Bright blue
        'game-accent-light': '#E6F5FD',  // Light blue tint for backgrounds

        // NAV — dark navy, white text
        'game-nav': '#002C77',           // Nav bar — MMA dark navy

        // STATUS
        'game-red': '#DC2626',           // Danger/overdue
        'game-green': '#00968F',         // Success — MMA turquoise
        'game-blue': '#009DE0',          // Info — bright blue

        // Stat tiers — keep readable
        'stat-s-plus': '#DC2626',
        'stat-s': '#EA580C',
        'stat-a-plus': '#FF8C00',
        'stat-a': '#00968F',
        'stat-c': '#2E5FA3',

        // Surface
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
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,157,224,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,157,224,0.5)' },
        }
      }
    },
  },
  plugins: [],
}