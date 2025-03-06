import { vitePlugin as remix } from '@remix-run/dev';
import { createRoutesFromFolders } from '@remix-run/v1-route-convention';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    remix({
      routes: defineRoutes => createRoutesFromFolders(defineRoutes),
    }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
  server: {
    port: 3000,
    cors: false
  }
});
