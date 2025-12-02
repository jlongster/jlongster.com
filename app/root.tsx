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

import baseStyles from '~/css/base.css?url';
import codeStyles from '~/css/code.css?url';
import nightOwlStyles from '~/css/night-owl.css?url';
import box3d from '~/css/box3d.css?url';

export function links() {
  return [
    { rel: 'stylesheet', href: nightOwlStyles },
    { rel: 'stylesheet', href: baseStyles },
    { rel: 'stylesheet', href: codeStyles },
    { rel: 'stylesheet', href: box3d },
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
    },

    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
    },
  ];
}

export const meta: MetaFunction = () => [
  { charset: 'utf-8' },
  { title: settings.title },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
];

export default function App() {
  const location = useLocation();
  const matches = useMatches();

  const childData = matches.find(match => match.data?.theme)?.data;
  const theme = childData?.theme;
  const bodyClassName = theme === 'dark' ? 'dark-mode' : 'light-mode';

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
      <body className={bodyClassName}>
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

        {/*<script src="/color-tool.js"></script>
        <script src="/noise-tool.js"></script>
          */}
        <script src="/element-mover.js"></script>
      </body>
    </html>
  );
}
