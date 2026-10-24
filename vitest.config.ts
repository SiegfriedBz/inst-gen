import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` comment.
    environment: 'node',
  },
});
