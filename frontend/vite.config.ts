import { defineConfig, loadEnv } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const proxy: Record<string, ProxyOptions> = {
    '/api': {
      target: loadEnv(mode, process.cwd()).VITE_API_BASE_URL || 'http://127.0.0.1:8000',
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on('error', (_err, _req, res) => {
          if (res && 'writeHead' in res && !res.headersSent && !res.writableEnded) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ detail: 'No se pudo conectar al backend.' }));
          }
        });
      },
    },
  };
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  };
});
