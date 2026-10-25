/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  // Shown in Settings > General > About.
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The largest chunk is CodeMirror (~530 kB), loaded only by the glossary entry editor.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Libraries every page needs, in their own long-cached chunks (pages are lazy, see routes.tsx).
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            { name: 'data', test: /node_modules[\\/](dexie|@tanstack)[\\/]/ },
            // Only the glossary entry editor loads it.
            { name: 'codemirror', test: /node_modules[\\/](@codemirror|@lezer|codemirror)[\\/]/ },
            {
              name: 'ui',
              test: /node_modules[\\/](radix-ui|@radix-ui|i18next|react-i18next)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
