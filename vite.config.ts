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
  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
