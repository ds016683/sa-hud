import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cache-bust: timestamp suffix ensures new filenames on every deploy
// so browsers always fetch fresh bundles without needing hard-refresh
const ts = Date.now()

// Every build carries its stamp (__HUD_BUILD__ in the bundle) and publishes it as /build.json, so a
// tab still running an older bundle can notice a newer one is live (BuildNotice, David 11/9).
const buildStamp = () => ({ name: 'hud-build-stamp', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify({ id: String(ts), at: new Date(ts).toISOString() }) }) } })

export default defineConfig({
  plugins: [react(), buildStamp()],
  base: '/',
  // Run locally (a branch on David's machine), the page still talks to the live HUD's functions with his own session.
  server: { proxy: { '/api': { target: 'https://sa-hud.vercel.app', changeOrigin: true } } },
  define: { __HUD_BUILD__: JSON.stringify(String(ts)) },
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
