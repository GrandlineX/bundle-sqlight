import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reportsDirectory: './docs/coverage',
            reporter: ['text', 'cobertura', 'html'],
        },
        reporters:  ['default', 'junit'],
        outputFile: { junit: './docs/coverage/junit.xml' },
    },
});
