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

  // Create a histogram to track response size
  const httpResponseSize = new Histogram({
    name: 'http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  });

  // Track the current day and reset metrics at midnight
  let currentDay = new Date().toDateString();

  const checkAndResetDaily = () => {
    const today = new Date().toDateString();
    if (today !== currentDay) {
      console.log('New day detected, resetting metrics');
      currentDay = today;
      httpResponseSize.reset();
    }
  };

  // Check for day change every minute
  setInterval(checkAndResetDaily, 60000);

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

  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
  );

  // Response size tracking middleware for all requests
  app.use((req, res, next) => {
    let responseSize = 0;

    // Intercept write method
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, ...args) {
      if (chunk) {
        responseSize += Buffer.byteLength(chunk);
      }
      return originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = function (chunk, ...args) {
      if (chunk) {
        responseSize += Buffer.byteLength(chunk);
      }
      return originalEnd.apply(res, [chunk, ...args]);
    };

    res.on('finish', () => {
      checkAndResetDaily();

      const route = req.path || 'unknown';

      console.log('size', route, responseSize);

      httpResponseSize
        .labels(req.method, route, res.statusCode.toString())
        .observe(responseSize);
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
