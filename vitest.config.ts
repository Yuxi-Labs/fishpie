import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Enforce tests to reside strictly under src/__tests__
    include: ['src/__tests__/**/*.{ts,tsx}'],
    // Do not allow flat tests directly under src/__tests__; require mirrored subfolders
    exclude: ['src/__tests__/*.{ts,tsx}'],
    isolate: true,
    globals: true,
    setupFiles: [],
    coverage: {
      provider: 'v8',
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
    },
  },
});
