import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
        setupFiles: ['./__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/main.ts',
                'src/index.ts',
                'src/**/index.ts',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 65,
                statements: 70,
            },
        },
    },
});
