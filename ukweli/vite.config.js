import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { fileURLToPath } from 'url'

export default defineConfig({
  resolve: { alias: { 'iceberg-js': fileURLToPath(new URL('./src/lib/iceberg-stub.js', import.meta.url)) } },
  css: { postcss: { plugins: [] } },  // don't inherit the parent repo's postcss.config.mjs
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'UkweliSRHR',
        short_name: 'UkweliSRHR',
        description: 'Fresh & friendly. Straight answers about your body, your health, your rights. No judgment.',
        theme_color: '#14201C',
        background_color: '#0E1614',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'] }
    })
  ],
  base: '/'
})
