import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/pdd-goods.js'),
      output: {
        format: 'iife',
        entryFileNames: 'pdd-goods.js',
      },
    },
  },
});
