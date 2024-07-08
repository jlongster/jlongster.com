import { useLoaderData } from '@remix-run/react';
import { PageList } from '../../page';
import * as db from '../../db/new/queries';
import { Layout } from '../../layout';

export async function loader({ params }) {
  let name = params['name'];
  let pages = db.getPagesWithTag(name);
  return { name, pages };
}

export default function Links(props) {
  let { name, pages } = useLoaderData();
  return (
    <Layout name="tags">
      <h1>
        Pages linked to <strong>{name}</strong>
      </h1>
      <PageList pages={pages} />
    </Layout>
  );
}
