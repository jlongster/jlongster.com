import { useLoaderData } from '@remix-run/react';
import * as db from '../db/new/db.server';
import { getPage, getBlocks } from '../db/new/queries';
import { formatDate } from '../page';
import { Blocks } from '../blocks';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pageUrl = params['*'];

  let conn = db.load(pageUrl);
  if (conn == null) {
    throw new Response('Page not found', { status: 404 });
  }

  return {
    page: getPage(conn),
    blocks: getBlocks(conn),
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
    'twitter:card': 'summary_large_image',
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

export default function RenderPage(props) {
  let { page, blocks } = useLoaderData();

  return (
    <Layout name="page">
      <main className="page-content">
        <div className="title">
          <h1>{page.title}</h1>
          {page.subtitle && <h2>{page.subtitle}</h2>}
        </div>
        <PageProps page={page} />
        <Blocks blocks={blocks} />
      </main>
      <script src="/code-look.js" />
    </Layout>
  );
}
