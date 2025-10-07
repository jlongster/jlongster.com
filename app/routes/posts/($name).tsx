import { useLoaderData } from '@remix-run/react';
import * as queries from '../../db/queries';
import { Layout } from '../../layout';
import { AlignedList } from '../../AlignedList';
import { formatDate } from '../../page';

export async function loader({ params }) {
  let name = params['name'];
  let pages = name ? queries.getPagesWithTag(name) : queries.getPages();

  pages = pages.filter(page => !(page.tags || []).includes('content'));

  return { name, pages };
}

export default function Links(props) {
  let { name, pages } = useLoaderData();
  return (
    <Layout name="posts">
      <h1>
        {name ? (
          <>
            Pages linked to <strong>{name}</strong>
          </>
        ) : (
          'All posts'
        )}
      </h1>
      <AlignedList
        items={pages.map(post => ({
          url: post.url,
          title: post.title,
          description: formatDate(post.date),
        }))}
      />
    </Layout>
  );
}
