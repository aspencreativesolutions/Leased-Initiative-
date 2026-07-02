import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Vite config for Playwright — isolated ports + API proxy */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3011',
        changeOrigin: true,
      },
    },
  },
})
