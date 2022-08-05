import { useLoaderData } from '@remix-run/react';
import { PageList } from '../../page';
import * as db from '../../db/website';

export async function loader({ params }) {
  let name = params['name'];
  let pages = db.getLinkedPages(name);
  return { name, pages };
}

export default function Links(props) {
  let { name, pages } = useLoaderData();
  return (
    <div>
      Pages linked to <strong>{name}</strong>
      <PageList pages={pages} />
    </div>
  );
}
