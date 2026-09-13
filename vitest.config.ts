// FILE: vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';    

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Playwright e2e specs live under `tests/` (playwright.config.ts testDir)
    // and in `**/e2e/**` folders next to the code they exercise (e.g.
    // src/app/api/auth/[...nextauth]/e2e/login.spec.ts). Vitest's default
    // include glob (`**/*.spec.ts`) matches these too, but they use the
    // `@playwright/test` test runner, not vitest's — running them under
    // vitest throws "Playwright Test did not expect test() to be called
    // here". Exclude both locations so `vitest run` only picks up real
    // vitest unit tests.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'tests/**',
      '**/e2e/**',
    ],
  },
});