import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd() + '/../../', '');
    return {
        test: {
            globals: true,
            environment: 'node',
            include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
            setupFiles: ['./src/test-db-probe.setup.mts'],
            env,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
                include: ['src/**/*.ts'],
                exclude: [
                    'src/**/*.test.ts',
                    'src/index.ts',
                    'src/**/index.ts',
                ],
            },
        },
    };
});
