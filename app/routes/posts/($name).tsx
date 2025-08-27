import { useLoaderData } from '@remix-run/react';
import { EnhancedPageList } from '../../page';
import * as queries from '../../db/queries';
import { Layout } from '../../layout';
import { PageList } from '../../page';

export async function loader({ params }) {
  let name = params['name'];
  let pages = name ? queries.getPagesWithTag(name) : queries.getPages();

  pages = pages.filter(page => !page.tags || !page.tags.includes('content'));

  let recentPosts = queries
    .getPages()
    .filter(page => !page.tags || !page.tags.includes('content'));

  return { name, pages, recentPosts };
}

export default function Links(props) {
  let { name, pages, recentPosts } = useLoaderData();
  return (
    <Layout name="posts" recentPosts={recentPosts}>
      <h1>
        {name ? (
          <>
            Pages linked to <strong>{name}</strong>
          </>
        ) : (
          'All posts'
        )}
      </h1>
      <PageList pages={pages} />

      <section style={{ marginTop: 50, fontSize: 13, color: '#818a92' }}>
        If you are looking for my old posts,{' '}
        <a href="https://archive.jlongster.com/">view the archived site</a>.
      </section>
    </Layout>
  );
}
