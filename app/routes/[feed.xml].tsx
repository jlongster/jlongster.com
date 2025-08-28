import { renderToStaticMarkup } from 'react-dom/server';
import { addHours, toDate } from 'date-fns';
import * as db from '../db';
import { renderBlock } from '../md/render';
import settings from '../settings';
import { getPages, getBlocks } from '../db/queries';

function siteUrl(siteUrl, url) {
  return siteUrl + url;
}

function start() {
  let latest = Date.now();

  return function record(str) {
    let now = Date.now();
    console.log('[PERF]', str, now - latest);
    latest = now;
    return null;
  };
}

export function loader({ request }) {
  const record = start();
  let url = settings.currentSite;
  let posts = getPages().slice(0, 50);

  record('loaded all pages');

  let feed = (
    <feed xmlns="http://www.w3.org/2005/Atom" xmlLang="en-us">
      <id>{url.href}</id>
      <link rel="self" type="application/atom+xml" href={url.href} />
      <link rel="alternate" type="text/html" href={siteUrl(url, '/')} />
      <updated>{posts.length > 0 ? posts[0].date.toISOString() : null}</updated>
      <title>{settings.title}</title>
      <subtitle>{settings.subtitle}</subtitle>
      <icon>{siteUrl(url, '/favicon.ico')}</icon>
      <author>
        <name>{settings.author}</name>
        <uri>{siteUrl(url, '/')}</uri>
      </author>
      <rights>© 2022 James Long</rights>
      <generator uri={url.href}>jimmy</generator>
      {record('generated some XML')}
      {posts.map(post => {
        let pageUrl = siteUrl(url, `/${post.url}`);
        // Add 12 hours because the date is always midnight, but we
        // want the post to appear as the same day in all timezones
        let date = toDate(addHours(post.date, 12)).toISOString();

        const blocks = getBlocks(db.load(post.url));

        let str = '';
        for (let block of blocks) {
          if (block.type === 'code' && block.meta.run && !block.meta.show) {
            str += '<em>(note: skipping interactive content block)</em><br />';
            continue;
          }

          str += renderBlock(block, { nomath: true }) + '\n';
        }

        return (
          <entry key={post.url}>
            <id>{pageUrl}</id>
            <link rel="alternate" type="text/html" href={pageUrl} />
            <published>{date}</published>
            <updated>{date}</updated>
            <title>{post.title}</title>
            <author>
              <name>{settings.author}</name>
              <uri>{siteUrl(url, '/')}</uri>
            </author>
            {[...new Set(post.tags || [])].map(tag => (
              <category key={tag} term={tag} />
            ))}
            <content
              type="html"
              dangerouslySetInnerHTML={{ __html: `<![CDATA[${str}]]>` }}
            />
            <rights>© 2024 James Long</rights>
          </entry>
        );
      })}
      {record('mapped over all the pages')}
    </feed>
  );

  let headers = new Headers();
  headers.set('Content-Type', 'application/xml');

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + renderToStaticMarkup(feed),
    { status: 200, headers },
  );
}
