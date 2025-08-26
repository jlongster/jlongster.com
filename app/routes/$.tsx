import { useLoaderData } from '@remix-run/react';
import * as db from '../db';
import {
  getPage,
  getPages,
  getBlocks,
  getTableOfContents,
} from '../db/queries';
import { formatDate } from '../page';
import { Blocks } from '../blocks';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pages = getPages();
  let pageUrl = params['*'] || 'index';

  const recentPosts = pages.filter(
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
    recentPosts,
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

function getIcon(name) {
  switch (name.toLowerCase()) {
    case 'x':
      return <XIcon />;
    case 'home':
      return <HomeIcon />;
    case 'posts':
      return <PostsIcon />;
  }

  throw new Error('Unknown icon: ' + name);
}

function FloatingMenuAction() {
  return (
    <div className="floating-menu-action">
      <img src="/logo.svg" />
    </div>
  );
}

export default function RenderPage(props) {
  let {
    contentPages,
    recentPosts,
    page,
    sectionName,
    blocks,
    toc,
  } = useLoaderData();

  return (
    <Layout name="post" toc={toc} page={page} recentPosts={recentPosts}>
      {!page.minimal ? (
        <>
          <div className="title">
            <h1>{page.title}</h1>
            {page.subtitle && <h2>{page.subtitle}</h2>}
          </div>
          <div className="date">{formatDate(page.date)}</div>
        </>
      ) : null}

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

      <script src="/code-look.js" />
      <script src="/enhance-links.js" />
      <script src="/toc.js" />
      <script src="/tweet.js" />
    </Layout>
  );
}
