import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const pkgSrc = path.resolve(__dirname, '../../packages/react-infinite-canvas/src');

export default defineConfig({
  resolve: {
    alias: {
      '@infinit-canvas/react/styles.css': path.join(pkgSrc, 'styles.css'),
      '@infinit-canvas/react': path.join(pkgSrc, 'index.js'),
    },
  },
  plugins: [
    react(),
    // SPA fallback for production build (dev server handles this automatically)
    {
      name: 'spa-fallback',
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          // Serve index.html for non-asset routes
          if (!req.url.includes('.') && req.url !== '/') {
            req.url = '/';
          }
          next();
        });
      },
    },
  ],
  appType: 'spa',
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '../..'),
      ],
    },
  },
});
