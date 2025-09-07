import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '**/*.config.ts',
        '**/*.test.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  define: {
    // Mock bun-specific modules for vitest
    'import.meta.env.BUN': false
  },
  optimizeDeps: {
    // Exclude bun-specific imports from optimization
    exclude: ['bun:sqlite', 'bun:test']
  }
});