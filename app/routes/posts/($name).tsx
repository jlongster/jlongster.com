import { useLoaderData } from '@remix-run/react';
import * as queries from '../../db/queries';
import { Layout } from '../../layout';
import { AlignedList } from '../../AlignedList';
import { formatDate } from '../../page';

export async function loader({ params }) {
  let name = params['name'];
  let pages = name ? queries.getPagesWithTag(name) : queries.getPages();

  pages = pages.filter(page => {
    const tags = page.tags || [];

    // These are tags that we shouldn't show in the recent posts
    return !(tags.includes('content') || tags.includes('experiment'));
  });

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
        ) : null}
      </h1>
      {pages.length > 0 ? (
        <AlignedList
          items={pages.map(post => ({
            url: post.url,
            title: post.title,
            description: formatDate(post.date),
          }))}
        />
      ) : (
        <div className="italic">None</div>
      )}
    </Layout>
  );
}
