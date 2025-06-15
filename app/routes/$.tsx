import { useLoaderData } from '@remix-run/react';
import * as db from '../db';
import {
  getPage,
  getPages,
  getBlocks,
  getTableOfContents,
} from '../db/queries';
import { formatDate } from '../page';
import { Blocks, TableOfContents } from '../blocks';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pages = getPages();
  let pageUrl = params['*'] || 'index';

  const contentPages = pages.filter(
    page => page.tags && page.tags.includes('content'),
  );
  const posts = pages.filter(
    page => !page.tags || !page.tags.includes('content'),
  );

  let [name, sectionName] = pageUrl.includes('/')
    ? pageUrl.split('/')
    : [pageUrl, null];

  let conn = db.load(name);
  if (conn == null) {
    throw new Response('Page not found', { status: 404 });
  }

  let page = getPage(conn);
  let toc = null;
  if (page.toc) {
    toc = getTableOfContents(conn);
  }

  return {
    contentPages,
    posts,
    page,
    sectionName,
    blocks: getBlocks(conn),
    toc,
  };
}

export function meta({ matches, data }) {
  const parentMeta = matches
    .flatMap(match => match.meta || [])
    .filter(m => m.title == null);

  let { page, blocks } = data;
  let contentIndex = 0;

  while (
    contentIndex < blocks.length &&
    // Skip any children that match these
    (blocks[contentIndex].type === 'code' || blocks[contentIndex].string === '')
  ) {
    contentIndex++;
  }

  let imgUrl = page['featured-image'];

  return [
    ...parentMeta,
    { title: page.title },
    {
      name: 'twitter:card',
      content: imgUrl ? 'summary_large_image' : 'summary',
    },
    ...(imgUrl
      ? [
          { name: 'twitter:image', content: imgUrl },
          { name: 'twitter:image:type', content: '' },
        ]
      : []),
    { name: 'twitter:title', content: page.title },
    {
      name: 'twitter:description',
      content: contentIndex < blocks.length ? blocks[contentIndex].string : '',
    },

    imgUrl ? { property: 'og:image', content: imgUrl } : null,
    { property: 'og:title', content: page.title },
    {
      property: 'og:description',
      content: contentIndex < blocks.length ? blocks[contentIndex].string : '',
    },
  ];
}

function PageProps({ page }) {
  return (
    <div className="properties">
      <div>
        {page.tags && page.tags.length > 0 ? (
          <>
            <strong>tags::</strong>{' '}
            {page.tags.map((v, i) => {
              let els = [
                <a key={v} href={`/links/${v}`}>
                  {v}
                </a>,
              ];
              if (i !== page.tags.length - 1) {
                els.push(', ');
              }
              return els;
            })}
          </>
        ) : null}
      </div>

      <div>
        <strong>date::</strong> {formatDate(page.date)}
      </div>
    </div>
  );
}

function FilteredSectionNotification({ title, url, sectionName, position }) {
  return (
    <>
      {position === 'bottom' && (
        <div className="filtered-section-dots">
          <div>&middot;</div>
          <div>&middot;</div>
          <div>&middot;</div>
        </div>
      )}
      <div className="filtered-section-notification">
        You are viewing a filtered version of a post. This is a single section
        pulled from <a href={`/${url}`}>{title}</a> intended to focus on this
        specific content. You can{' '}
        <a href={`/${url}#${sectionName}`}>
          view this section in the context of the full article
        </a>{' '}
        if you'd like.
      </div>
      {position === 'top' && (
        <div className="filtered-section-dots">
          <div>&middot;</div>
          <div>&middot;</div>
          <div>&middot;</div>
        </div>
      )}
    </>
  );
}

function PageList({ pages, className, showDate = true }) {
  return (
    <div className={'page-list ' + className}>
      {pages.map(page => (
        <a href={'/' + page.url} className="page-list-item">
          <div>{page.title}</div>
          {showDate && (
            <div style={{ fontSize: 13, color: '#a0a0a0' }}>
              {formatDate(page.date)}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="page-list-section">{children}</div>;
}

export default function RenderPage(props) {
  let { contentPages, posts, page, sectionName, blocks, toc } = useLoaderData();

  return (
    <div className="site-content">
      <div className="site-content-left">
        <PageList className="content" pages={contentPages} showDate={false} />

        {toc ? (
          <div >
            <div class="toc">
              <SectionTitle>Table of contents</SectionTitle>
              <TableOfContents toc={toc} pageid={page.url} />
            </div>
          </div>
        ) : (
          <>
            <SectionTitle>Recent posts</SectionTitle>
            <PageList pages={posts} />
          </>
        )}
      </div>

      <div className="site-content-main">
        <main className="page-content">
          <div className="title">
            <h1>{page.title}</h1>
            {page.subtitle && <h2>{page.subtitle}</h2>}
          </div>
          <PageProps page={page} />

          {sectionName && (
            <FilteredSectionNotification
              title={page.title}
              sectionName={sectionName}
              url={page.url}
              position="top"
            />
          )}

          <Blocks blocks={blocks} pageid={page.url} sectionName={sectionName} />

          {sectionName && (
            <FilteredSectionNotification
              title={page.title}
              sectionName={sectionName}
              url={page.url}
              position="bottom"
            />
          )}
        </main>
      </div>

      <script src="/code-look.js" />
      <script src="/enhance-links.js" />
      <script src="/toc.js" />
      <script src="/tweet.js" />
    </div>
  );
}
