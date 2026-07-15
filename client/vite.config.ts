import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    https: true,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // splits the big, slow-changing vendor libraries into their own
        // cacheable chunks — previously everything shipped as one 2.8MB
        // bundle, so any app-code change forced a re-download of Phaser/
        // MUI/Colyseus too
        manualChunks: {
          phaser: ['phaser'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          colyseus: ['colyseus.js'],
        },
      },
    },
  },
})
