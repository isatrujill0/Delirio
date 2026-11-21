import { defineConfig } from '@playwright/test';

// E2E runs against the production build at the iPad Air 11" landscape size.
// No retries: a flaky test is investigated or removed, never retried.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
    deviceScaleFactor: 1,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
