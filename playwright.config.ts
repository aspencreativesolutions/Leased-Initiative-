import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from '@playwright/test'
import { E2E_DB_PATH } from './e2e/global-setup.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = E2E_DB_PATH

const e2eEnv = {
  CLIENT_CRAFT_DB_FILE: dbPath,
  E2E_TEST: '1',
  JWT_SECRET: 'e2e-test-jwt-secret',
  PORT: '3011',
  APP_URL: 'http://127.0.0.1:5175',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  PLAYWRIGHT_BROWSERS_PATH: path.join(__dirname, '.playwright-browsers'),
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node server/index.js',
      url: 'http://127.0.0.1:3011/api/paypal/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: e2eEnv,
    },
    {
      command: 'npx vite --config vite.e2e.config.ts',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
