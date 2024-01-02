import { renderToStaticMarkup } from 'react-dom/server';
import html from 'html';
import { renderBlock } from '../md';
import { walkBlocks } from '../shared/data';
import settings from '../settings';
import { getPage, getPages } from '../db/website';

function siteUrl(siteUrl, url) {
  return siteUrl + url;
}

export function loader({ request }) {
  let url = settings.currentSite;
  let posts = getPages({ tags: ['sketchbook'] }).slice(0, 100);

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
      {posts.map(post => {
        let pageUrl = siteUrl(url, `/${post.url}`);
        let date = post.date.toISOString();

        const { page } = getPage(post.url);
        renderBlock(page);

        let str = '';
        walkBlocks(page, (b, nested) => {
          if (
            b.properties.render === 'js-element' ||
            b.properties.render === 'html'
          ) {
            str += '<p><i>(content unavailable in feed)</i></p>';
            return;
          } else if (b.raw.trim() === '' || b.properties.render) {
            return;
          }

          let bstr = '';
          for (let i = 1; i < nested; i++) {
            bstr = '*';
          }
          if (nested > 1) {
            bstr += ' ';
          }
          bstr += b.string;

          str += `<p>${bstr}</p>\n`;
        });

        return (
          <entry key={page.pageId}>
            <id>{pageUrl}</id>
            <link rel="alternate" type="text/html" href={pageUrl} />
            <published>{date}</published>
            <updated>{date}</updated>
            <title>{post.name}</title>
            <author>
              <name>{settings.author}</name>
              <uri>{siteUrl(url, '/')}</uri>
            </author>
            {[...new Set(post.properties.tags || [])].map(tag => (
              <category term={tag} />
            ))}
            <content
              type="html"
              dangerouslySetInnerHTML={{ __html: `<![CDATA[${str}]]>` }}
            />
            <rights>© 2022 James Long</rights>
          </entry>
        );
      })}
    </feed>
  );

  let headers = new Headers();
  headers.set('Content-Type', 'application/xml');
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      html.prettyPrint(renderToStaticMarkup(feed), { indent_size: 2 }),
    { status: 200, headers },
  );
}
