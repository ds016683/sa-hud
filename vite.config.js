import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cache-bust: timestamp suffix ensures new filenames on every deploy
// so browsers always fetch fresh bundles without needing hard-refresh
const ts = Date.now()

export default defineConfig({
  plugins: [react()],
  base: '/sa-hud/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${ts}.js`,
        chunkFileNames: `assets/[name]-[hash]-${ts}.js`,
        assetFileNames: `assets/[name]-[hash]-${ts}.[ext]`,
      }
    }
  }
})
