import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { localFireData } from './local-data'

export default defineConfig({
  plugins: [react(), localFireData()],
  build: {
    // Flag SVGs stay separate files, so they are only fetched when shown.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
  },
})
