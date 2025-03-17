import { useLoaderData } from '@remix-run/react';
import { EnhancedPageList } from '../../page';
import * as queries from '../../db/queries';
import { Layout } from '../../layout';

export async function loader({ params }) {
  let name = params['name'];
  let pages = name ? queries.getPagesWithTag(name) : queries.getPages();
  return { name, pages };
}

export default function Links(props) {
  let { name, pages } = useLoaderData();
  return (
    <Layout name="tags">
      <h1>
        {name ? (
          <>
            Pages linked to <strong>{name}</strong>
          </>
        ) : (
          'All posts'
        )}
      </h1>
      <EnhancedPageList pages={pages} />
    </Layout>
  );
}
