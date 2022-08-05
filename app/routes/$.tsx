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

  renderBlock(page);
  // for (let backref of page.backrefs) {
  //   renderBlock(backref.block);
  // }

  // page.backrefs.sort((r1, r2) => r2.editTime - r1.editTime);
  // page.backrefs = groupByArray(page.backrefs, 'pageId');

  return { page, refs };
}

export default function RenderPage(props) {
  let { page } = useLoaderData();
  return (
    <>
      <header>
        <a href="/">home</a>
      </header>
      <main className="page">
        <h1>{page.name}</h1>
        <Page page={page} />
      </main>
    </>
  );
}
