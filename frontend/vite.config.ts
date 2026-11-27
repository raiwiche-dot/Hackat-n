import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Destino del proxy de desarrollo (FastAPI en la misma laptop).
  const target = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8081';

  const proxyBackend: ProxyOptions = {
    target,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('error', (_err, _req, res) => {
        if (res && 'writeHead' in res && !res.headersSent && !res.writableEnded) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: `Backend no disponible en ${target}.` }));
        }
      });
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      hmr: true,
      watch: { usePolling: false },
      proxy: {
        '/api': proxyBackend,
        '/health': proxyBackend,
        '/openapi.json': proxyBackend,
      },
    },
  };
});
