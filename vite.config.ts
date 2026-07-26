import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { liveUpdateVersionPlugin } from './vite.liveUpdateVersionPlugin'

export default defineConfig({
  plugins: [react(), liveUpdateVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.CLIENT_CRAFT_PORT) || 3021,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
