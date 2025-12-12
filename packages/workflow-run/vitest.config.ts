import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd() + '/../../', '');
    return {
        test: {
            globals: true,
            environment: 'node',
            include: ['src/**/*.test.ts'],
            env,
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
                    lines: 60,
                    functions: 60,
                    branches: 50,
                    statements: 60,
                },
            },
        },
    };
});
