import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Match the tsconfig "@/*" -> "./*" alias, but only for "@/..." so scoped package
  // names like "@anthropic-ai/sdk" still resolve normally.
  resolve: {
    alias: [{ find: /^@\//, replacement: `${root}/` }],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // A dummy key so modules that build an SDK client at import time (lib/claude) load in tests.
    env: { ANTHROPIC_API_KEY: 'sk-test', VOYAGE_API_KEY: 'test' },
  },
});
