import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/property/**/*.test.ts'],
    environment: 'node',
    // fast-check runs are seeded per test (see tests/property) so failures reproduce exactly.
  },
});
