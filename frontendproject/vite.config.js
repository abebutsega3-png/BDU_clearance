
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../scripts/load-backend-env.cjs');
const backendPort = Number(process.env.BACKEND_PORT || process.env.PORT || 3000);

export default defineConfig({
  base: '/',

  plugins: [react(), tailwindcss()],

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom')
            ) {
              return 'vendor-react';
            }

            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            return 'vendor';
          }
        },
      },
    },
  },
});
