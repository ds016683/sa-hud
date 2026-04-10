import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/sa-hud/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: ssets/[name]-[hash]-.js,
        chunkFileNames: ssets/[name]-[hash]-.js,
        assetFileNames: ssets/[name]-[hash]-.[ext],
      }
    }
  }
})
