import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ReactInfiniteCanvas',
      formats: ['es', 'cjs'],
      fileName: 'react-infinite-canvas',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        assetFileNames: '[name][extname]',
      },
    },
    cssFileName: 'styles',
    copyPublicDir: false,
  },
  worker: {
    format: 'es',
  },
});
