import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindNesting from 'tailwindcss/nesting';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    sourcemap: false,
    // Remove problematic build options that were causing empty builds
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindNesting,
        tailwindcss({
          config: path.resolve(__dirname, './tailwind.config.js')
        }),
        autoprefixer,
      ],
    },
  },
});
