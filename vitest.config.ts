import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    alias: {
      '@retro-pi-hub/shared': path.resolve(__dirname, 'packages/shared/src/index.ts')
    }
  }
});
