import { useLoaderData } from '@remix-run/react';
import * as db from '../db';
import { getPage, getBlocks, getTableOfContents } from '../db/queries';
import { formatDate } from '../page';
import { Blocks, TableOfContents } from '../blocks';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pageUrl = params['*'];

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
    page,
    sectionName,
    blocks: getBlocks(conn),
    toc,
  };
}

export function meta({ data }) {
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

  return {
    title: page.title,
    'twitter:card': imgUrl ? 'summary_large_image' : 'summary',
    ...(imgUrl ? { 'og:image': imgUrl } : null),
    'og:title': page.title,
    'og:description':
      contentIndex < blocks.length ? blocks[contentIndex].string : '',
  };
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

export default function RenderPage(props) {
  let { page, sectionName, blocks, toc } = useLoaderData();

  return (
    <Layout
      name="page"
      sidebar={toc ? <TableOfContents toc={toc} pageid={page.url} /> : null}
    >
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
      <script src="/code-look.js" />
      <script src="/enhance-links.js" />
      <script src="/toc.js" />
    </Layout>
  );
}
