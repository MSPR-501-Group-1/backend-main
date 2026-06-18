import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'controllers/**/*.js',
        'middlewares/**/*.js',
        'services/**/*.js',
        'routes/**/*.js',
        'schemas/**/*.js',
        'lib/**/*.js',
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'cron/**',
        'swagger.cjs',
      ],
    },
  },
})
