import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/leaseScan.test.ts'],
  },
})
