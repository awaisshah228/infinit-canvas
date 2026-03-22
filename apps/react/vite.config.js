import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        // Allow serving files from the workspace root (needed for worker in packages/)
        path.resolve(__dirname, '../..'),
      ],
    },
  },
});
