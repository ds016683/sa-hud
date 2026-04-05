/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'game-dark': '#F7F9FC',
        'game-darker': '#EFF4FA',
        'game-panel': '#FFFFFF',
        'game-border': '#E2E8F0',
        'game-text': '#002C77',
        'game-text-muted': '#334E85',
        'game-text-dim': '#4A6FA5',
        'game-text-subtle': '#6B8CBE',
        'game-gold': '#009DE0',
        'game-gold-true': '#FF8C00',
        'game-purple': '#009DE0',
        'game-accent': '#009DE0',
        'game-accent-light': '#E6F5FD',
        'game-nav': '#002C77',
        'game-red': '#EF4E45',
        'game-green': '#00968F',
        'game-blue': '#009DE0',
        'game-surface': '#FFFFFF',
        'stat-s-plus': '#EF4E45',
        'stat-s': '#FF8C00',
        'stat-a-plus': '#FFBE00',
        'stat-a': '#00968F',
        'stat-c': '#8096B2',
      },
      fontFamily: {
        'game': ['"Cinzel"', 'serif'],
        'mono': ['"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
}