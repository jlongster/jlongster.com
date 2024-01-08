import type { MetaFunction } from '@remix-run/node';
import { Links, LiveReload, Meta, Outlet } from '@remix-run/react';
import settings from './settings';

import siteStyles from '~/css/site.css';
import nightOwlStyles from '~/css/night-owl.css';

export function links() {
  return [
    { rel: 'stylesheet', href: nightOwlStyles },
    { rel: 'stylesheet', href: siteStyles },
  ];
}

export const meta: MetaFunction = () => ({
  charset: 'utf-8',
  title: settings.title,
  viewport: 'width=device-width,initial-scale=1',
});

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Reader Feed"
          href="https://jlongster.com/feed.xml"
        />
      </head>
      <body>
        <Outlet />
        <LiveReload />
      </body>
    </html>
  );
}
