import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Executable business logic shared by web and mobile. Excludes static theme/locale data and barrel exports.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/**/types.ts', 'src/theme/**', 'src/i18n/**'],
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      thresholds: {
        perFile: true,
        statements: 95,
        lines: 95,
        branches: 90,
        functions: 100,
      },
    },
  },
});
