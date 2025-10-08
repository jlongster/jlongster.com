import { useLoaderData } from '@remix-run/react';
import * as db from '../db';
import {
  getPage,
  getPages,
  getBlocks,
  getTableOfContents,
} from '../db/queries';
import { renderString } from '../md/render';
import { formatDate } from '../page';
import { Blocks } from '../blocks';
import { Layout, Footer, BareFooter } from '../layout';
import { AlignedList } from '../AlignedList';
import { XIcon } from '../icons/x';

export async function loader({ params }) {
  let pageUrl = params['*'] || 'index';

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

  const recentPosts = getPages()
    .filter(page => {
      const tags = page.tags || [];

      // These are tags that we shouldn't show in the recent posts
      return !(tags.includes('content') || tags.includes('experiment'));
    })
    .slice(0, 3);

  return {
    page,
    sectionName,
    blocks: getBlocks(conn),
    toc,
    recentPosts,
    theme: page.theme,
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

function FloatingMenuAction() {
  return (
    <div className="floating-menu-action">
      <img src="/logo.svg" />
    </div>
  );
}

export default function RenderPage(props) {
  let { contentPages, recentPosts, page, sectionName, blocks, toc } =
    useLoaderData();

  const minimal = page.minimal || (page.tags || []).includes('experiment');

  return (
    <Layout
      name="post"
      minimal={minimal}
      toc={toc}
      page={page}
      footer={
        page.notes ? (
          <BareFooter className="mt-[200px] mb-[150px] max-w-[900px] mx-auto flex justify-between">
            <div
              className="max-w-[500px] text-sm text-subdued [&_p:first-of-type]:my-0 [&_p:last-of-type]:mb-0 [&_p]:my-3"
              dangerouslySetInnerHTML={{
                __html: renderString(`**${page.title}**\n\n${page.notes}`),
              }}
            />

            <a
              className="block uncolored-link"
              href="https://twitter.com/jlongster"
            >
              <XIcon />
            </a>
          </BareFooter>
        ) : (
          <Footer>
            {minimal ? null : (
              <>
                <div className="text-[length:12px] w-fit mx-auto my-[140px] text-[#909090]">
                  ◇◇
                </div>

                <div className="mb-4 text-[#818a90] font-semibold">
                  Read more
                </div>
                <AlignedList
                  items={recentPosts.map(post => ({
                    url: post.url,
                    title: post.title,
                    description: formatDate(post.date),
                  }))}
                />
              </>
            )}
          </Footer>
        )
      }
    >
      {minimal ? null : (
        <div className="post-header">
          <div className="[&_img]:max-w-full">
            <h1>{page.title}</h1>
            {page.subtitle && <h2>{page.subtitle}</h2>}
          </div>
          <div className="text-[#818a92] text-[length:15px] mb-[25px]">
            {formatDate(page.date)}
          </div>
        </div>
      )}

      {sectionName && (
        <FilteredSectionNotification
          title={page.title}
          sectionName={sectionName}
          url={page.url}
          position="top"
        />
      )}

      <div className="[&_p:first-of-type]:my-0 [&_p:last-of-type]:mb-0 [&_p]:my-6">
        <Blocks blocks={blocks} pageid={page.url} sectionName={sectionName} />
      </div>

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
