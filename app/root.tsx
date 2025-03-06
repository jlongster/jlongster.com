import type { MetaFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  useLocation,
  useMatches,
} from '@remix-run/react';
import settings from './settings';

import siteStyles from '~/css/site.css?url';
import nightOwlStyles from '~/css/night-owl.css?url';
import box3d from '~/css/box3d.css?url';

export function links() {
  return [
    { rel: 'stylesheet', href: nightOwlStyles },
    { rel: 'stylesheet', href: siteStyles },
    { rel: 'stylesheet', href: box3d },
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
    },
  ];
}

export const meta: MetaFunction = () => [
  { charset: 'utf-8' },
  { title: settings.title },
  { viewport: 'width=device-width,initial-scale=1' },
];

export default function App() {
  const location = useLocation();
  const matches = useMatches();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?2" />
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Reader Feed"
          href="https://jlongster.com/feed.xml"
        />
      </head>
      <body>
        <Outlet />
        {location.pathname.startsWith('/interactive') && <Scripts />}

        {typeof process !== 'undefined' && process.env !== 'development' && (
          <>
            <script
              async
              src="https://www.googletagmanager.com/gtag/js?id=G-8B9TD7JBEJ"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-8B9TD7JBEJ');
`,
              }}
            />
          </>
        )}

        {/*<script src="/color-picker.js" type="module" />*/}
      </body>
    </html>
  );
}
