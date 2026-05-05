import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only list files that exist under `public/` (avoid 404s in precache / manifest).
      includeAssets: ['filmvault.svg'],
      manifest: {
        name: 'FilmVault',
        short_name: 'FilmVault',
        description: 'Catalog and share your physical DVD collection',
        theme_color: '#000000',
        icons: [
          {
            src: 'filmvault.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

