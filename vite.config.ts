import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // CBOE CDN proxy — official VIX/VIX3M source, no rate limits
      '/api/cboe': {
        target: 'https://cdn.cboe.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cboe/, ''),
      },
    },
  },
})
