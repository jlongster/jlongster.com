import { useLoaderData } from '@remix-run/react';
import { PageList } from '../page';
import { getPages } from '../db/website';

export async function loader({ params }) {
  let pages = getPages();
  return { pages };
}

export default function Index() {
  let { pages } = useLoaderData();
  return (
    <div>
      Pick one!
      <PageList pages={pages} />
      Looking for old articles? See{' '}
      <a href="https://archive.jlongster.com">archive.jlongster.com</a>
    </div>
  );
}
