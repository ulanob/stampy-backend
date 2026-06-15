import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    env: loadEnv(mode, process.cwd(), ''),
    fileParallelism: false,
  },
}));