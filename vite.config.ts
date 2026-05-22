import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// Middleware plugin: handles /api/* routes locally (in Vercel prod they are serverless functions)
function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-routes',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/') || req.method !== 'POST') return next();
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const route = req.url.replace('/api/', '').split('?')[0];
            const handler = await server.ssrLoadModule(`/api/${route}.ts`);
            const mockReq = { method: 'POST', body };
            let statusCode = 200;
            const mockRes = {
              status(code: number) { statusCode = code; return mockRes; },
              json(data: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = statusCode;
                res.end(JSON.stringify(data));
              }
            };
            await handler.default(mockReq, mockRes);
          } catch (e: any) {
            console.error('[API dev]', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // Make env vars available to API handlers running in Vite's SSR context
  Object.assign(process.env, env);

  // Si VITE_PROD_API_URL está seteada, las llamadas /api/* se proxean a
  // producción en vez de usar el plugin dev local. Útil cuando una env var
  // sensible (ej. ANTHROPIC_API_KEY) solo vive en Vercel y no querés copiarla
  // a .env.local. El resto de la app (Supabase, UI) sigue corriendo local.
  const prodApiUrl = env.VITE_PROD_API_URL?.trim();
  const useProxyToProd = !!prodApiUrl;

  return {
    plugins: useProxyToProd
      ? [react(), tailwindcss()]              // sin apiDevPlugin: el proxy se encarga
      : [react(), tailwindcss(), apiDevPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      ...(useProxyToProd && {
        proxy: {
          '/api': {
            target: prodApiUrl,
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (_req, req) => {
                console.log(`[proxy → prod] ${req.method} ${req.url}`);
              });
              proxy.on('error', (err) => {
                console.error('[proxy error]', err.message);
              });
            },
          },
        },
      }),
    },
  };
});
