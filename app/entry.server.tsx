import fs from 'fs';
import { join } from 'path';
import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';
import { parse } from 'csv/sync';
import { rootPath } from './shared/util';

let redirectData = parse(fs.readFileSync(join(rootPath(), 'data/redirects')));
let redirects = Object.fromEntries(redirectData);

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  let url = new URL(request.url);
  let pathname = url.pathname;

  if (
    process.env.NODE_ENV === 'production' &&
    url.host !== 'jlongster.com' &&
    url.search !== '?live'
  ) {
    // This protects users from accessing the underlying fly instance
    // directly at https://jlongster.fly.dev
    responseHeaders.set('Location', 'https://jlongster.com' + pathname);
    return new Response('', { status: 301, headers: responseHeaders });
  } else if (redirects[pathname]) {
    responseHeaders.set('Location', redirects[pathname]);
    return new Response('', { status: 301, headers: responseHeaders });
  } else if (pathname.startsWith('/s/')) {
    responseHeaders.set('Location', 'https://archive.jlongster.com' + pathname);
    return new Response('', { status: 301, headers: responseHeaders });
  } else if (
    pathname === '/future-sql-web' ||
    pathname === '/future-sql-web/'
  ) {
    return fetch('https://jlongster-static.pages.dev/future-sql-web/');
  }

  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />,
  );

  responseHeaders.set('Content-Type', 'text/html');

  if (url.pathname.startsWith('/code-look/')) {
    // Never cache the live coding pages
    responseHeaders.set('CDN-Cache-Control', 'max-age=0, no-store');
  } else if (process.env.NODE_ENV !== 'production') {
    // Never cache anything in dev
    responseHeaders.set('CDN-Cache-Control', 'max-age=0, no-store');
  } else {
    responseHeaders.set(
      'CDN-Cache-Control',
      'max-age=3600, stale-while-revalidate=3, stale-if-error=86400',
    );
  }
  responseHeaders.set('Cache-Control', 'max-age=0, no-store');

  return new Response('<!DOCTYPE html>' + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
