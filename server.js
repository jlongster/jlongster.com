import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import express from 'express';
import { register, Histogram } from 'prom-client';

installGlobals();

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Create a histogram to track request duration
  const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve static files from build/client in production
  if (process.env.NODE_ENV === 'production') {
    app.use(
      '/assets',
      express.static('build/client', { immutable: true, maxAge: '1y' }),
    );
  }

  // Timing middleware for all requests
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.path || 'unknown';

      httpRequestDuration
        .labels(req.method, route, res.statusCode.toString())
        .observe(duration);
    });

    next();
  });

  // if (!isProd) {
  //   // Development: spin up Vite in middleware mode and let Remix load the virtual build
  //   const vite = await import('vite');
  //   const viteServer = await vite.createServer({
  //     server: { middlewareMode: true },
  //     appType: 'custom',
  //   });
  //   app.use(viteServer.middlewares);

  //   app.all(
  //     '*',
  //     createRequestHandler({
  //       // NOTE: pass a function so Remix reloads on file changes
  //       build: () => viteServer.ssrLoadModule('virtual:remix/server-build'),
  //       mode: 'development',
  //     }),
  //   );
  // } else {
  // Production: use your built server bundle
  const serverBuild = await import('./build/server/index.js');
  app.all(
    '*',
    createRequestHandler({
      build: serverBuild,
      mode: 'production',
    }),
  );
  // }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Metrics available at http://localhost:${port}/metrics`);
  });
}

startServer().catch(console.error);
