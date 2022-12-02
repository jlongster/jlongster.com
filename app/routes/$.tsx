import { useLoaderData } from '@remix-run/react';
import { renderBlock } from '../md';
import { Page } from '../page';
import * as db from '../db/website';

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
  if (children.length > 0 && children[0].properties.public) {
    children.shift();
  }

  return {
    title: data.page.name,
    'twitter:card': 'summary',
    'og:title': data.page.name,
    'og:description': children[0].raw
  };
}

export default function RenderPage(props) {
  let { page, seriesPage } = useLoaderData();
  return (
    <>
      <header>
        <a href="/">home</a>
      </header>
      <main className="page">
        <h1>{page.name}</h1>
        <Page page={page} series={seriesPage} />
      </main>
    </>
  );
}
