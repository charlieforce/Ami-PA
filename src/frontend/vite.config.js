import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Data worth reading with no connection. Chat and anything that writes still need the server.
const OFFLINE_READS = [
  '/api/todos/today', '/api/tasks', '/api/reminders', '/api/calendar',
  '/api/admin/contacts', '/api/birthdays', '/api/briefings/today',
  '/api/medical/'
]

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // the service worker caches hard, which means a change can be in the
      // file, served by vite, and still not on screen. off while developing.
      devOptions: { enabled: false },
      manifest: {
        name: 'The Real Ami PA',
        short_name: 'Ami PA',
        description: 'Personal AI Assistant - Ami from Freetown',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: '/ami-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/ami-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        // the push handler rides along inside the generated worker
        importScripts: ['/push-handler.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // fresh when there is a connection, last good copy when there isn't
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              OFFLINE_READS.some(p => url.pathname.startsWith(p)),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ami-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
