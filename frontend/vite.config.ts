import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: true,
    watch: {
      usePolling: false,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent && !res.writableEnded) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ fallback: true }));
            }
          });
        },
      },
    },
  },
});