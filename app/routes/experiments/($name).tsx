import { useLoaderData } from '@remix-run/react';
import * as queries from '../../db/queries';
import { Layout, loadLayoutData } from '../../layout';
import { PageList } from '../../page';

export async function loader({ params }) {
  let name = params['name'];
  let pages = queries.getPagesWithTag('experiment');

  pages = pages.filter(page => (page.tags || []).includes('experiment'));

  return { name, pages, ...loadLayoutData() };
}

function Experiment({ page }) {
  return <div>{page.title}</div>;
}

export default function Links(props) {
  let { name, pages, recentPosts } = useLoaderData();
  return (
    <Layout name="posts" recentPosts={recentPosts}>
      <h1>Experiments</h1>
      {pages.map(page => (
        <Experiment page={page} />
      ))}
    </Layout>
  );
}
