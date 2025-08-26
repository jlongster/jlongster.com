import { useLoaderData } from '@remix-run/react';
import { EnhancedPageList } from '../../page';
import * as queries from '../../db/queries';
import { Layout } from '../../layout';
import { PageList } from '../../page';

export async function loader({ params }) {
  let name = params['name'];
  let pages = name ? queries.getPagesWithTag(name) : queries.getPages();

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
    </Layout>
  );
}
