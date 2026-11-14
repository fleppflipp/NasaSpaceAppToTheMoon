import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // Flag SVGs stay separate files, so they are only fetched when shown.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
  },
})
