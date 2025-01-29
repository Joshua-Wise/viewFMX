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
  define: {
        // Make env variables available
        'process.env': process.env,
        // Explicitly define VITE_ variables
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL),
        'import.meta.env.VITE_GOFMX_TOKEN': JSON.stringify(process.env.VITE_GOFMX_TOKEN),
        'import.meta.env.VITE_GOFMX_STATUS': JSON.stringify(process.env.VITE_GOFMX_STATUS)
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    sourcemap: true,
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