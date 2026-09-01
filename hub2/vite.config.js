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
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ImaarishaSRHR Hub',
        short_name: 'Imaarisha',
        description: 'The ImaarishaSRHR Collective Hub — radar, truth, community.',
        theme_color: '#F7F5EF',
        background_color: '#F7F5EF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'], navigateFallbackDenylist: [/privacy\.html$/, /admin\.html$/],
        importScripts: ['push-sw.js'] }
    })
  ],
  base: '/'
})
