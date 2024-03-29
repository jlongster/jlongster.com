import { useLoaderData } from '@remix-run/react';
import { renderBlock } from '../md';
import * as db from '../db/website';
import { Page } from '../page';
import { Layout } from '../layout';

export async function loader({ params }) {
  let pageUrl = params['*'];

  let { page, refs } = db.getPage(pageUrl);
  if (page == null) {
    throw new Response('Page not found', { status: 404 });
  }

  let seriesPage = null;
  if (page.properties.series) {
    // Linked pages are always an array, but we just want the first one
    let name = page.properties.series[0];
    let res = db.getPageByName(name);

    renderBlock(res.page);
    seriesPage = res.page;
  }

  renderBlock(page);
  // for (let backref of page.backrefs) {
  //   renderBlock(backref.block);
  // }

  // page.backrefs.sort((r1, r2) => r2.editTime - r1.editTime);
  // page.backrefs = groupByArray(page.backrefs, 'pageId');

  return { page, seriesPage, refs };
}

export function meta({ data }) {
  let page = data.page;
  let children = page.children;
  let contentIndex = 0;

  while (
    // Make sure we have a valid child
    contentIndex < children.length &&
    // Skip any children that match these
    (children[contentIndex].properties.public ||
      children[contentIndex].properties.render ||
      children[contentIndex].raw === '')
  ) {
    contentIndex++;
  }

  let imgUrl;
  if (data.page.properties['featured-image']) {
    // Match the part inside parens of [](...)
    const match = data.page.properties['featured-image'].match(/\]\((.*)\)/);
    if (match) {
      imgUrl = match[1];
    }
  }

  return {
    title: data.page.name,
    'twitter:card': 'summary_large_image',
    ...(imgUrl ? { 'og:image': imgUrl } : null),
    'og:title': data.page.name,
    'og:description':
      contentIndex < children.length ? children[contentIndex].raw : '',
  };
}

export default function RenderPage(props) {
  let { page, seriesPage } = useLoaderData();
  return (
    <Layout name="page">
      <main className="page-content">
        <div className="title">
          <h1>{page.name}</h1>
          {page.properties.subtitle && <h2>{page.properties.subtitle}</h2>}
        </div>
        <Page page={page} series={seriesPage} />
      </main>
      <script src="/code-look.js" />
      <script src="/newsletter-notification.js" />
    </Layout>
  );
}
