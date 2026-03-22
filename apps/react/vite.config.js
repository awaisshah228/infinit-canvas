import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
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
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '../..'),
      ],
    },
  },
});
