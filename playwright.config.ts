import { defineConfig, devices } from '@playwright/test'
import { getEnvironmentConfig } from './src/config/environment'

const env = getEnvironmentConfig()
const workers = process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 4
const trace = (process.env.E2E_TRACE ?? 'retain-on-failure') as
  | 'off'
  | 'on'
  | 'retain-on-failure'
  | 'on-first-retry'
const screenshot = (process.env.E2E_SCREENSHOT ?? 'only-on-failure') as
  | 'off'
  | 'on'
  | 'only-on-failure'
const video = (process.env.E2E_VIDEO ?? 'retain-on-failure') as
  | 'off'
  | 'on'
  | 'retain-on-failure'
  | 'on-first-retry'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseUrl,
    trace,
    screenshot,
    video,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'agent-seed',
      testMatch: /tests\/seed\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
})
