import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      clearMocks: true,
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      setupFiles: ['./tests/setup.ts'],
    },
  }),
);
