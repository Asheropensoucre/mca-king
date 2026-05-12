import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const apiPlugin = (): Plugin => ({
  name: 'mca-api-routes',
  configureServer(server) {
    server.middlewares.use('/api', async (req, res) => {
      const origin = `http://${req.headers.host ?? 'localhost:3000'}`;
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(Buffer.from(chunk)));
      req.on('end', async () => {
        try {
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
          const requestPath = `/api${req.url ?? '/'}`;
          const request = new Request(new URL(requestPath, origin), {
            method: req.method,
            headers: req.headers as HeadersInit,
            body,
          });
          const { handleApiRequest } = await import('./src/server/api');
          const response = await handleApiRequest(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.end('Internal server error');
        }
      });
    });
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    Object.assign(process.env, env);
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      root: __dirname,
      server: {
        port: 3000,
        strictPort: false,
        host: '0.0.0.0',
      },
      plugins: isProduction ? [react()] : [apiPlugin(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
