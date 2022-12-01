import { useLoaderData } from '@remix-run/react';
import { PageList } from '../page';
import { getPages } from '../db/website';

export async function loader({ params }) {
  let posts = getPages({ tags: ['post'] });
  let pinned = posts.filter(post =>
    post.properties.tags.find(t => t === 'pinned')
  );
  return { posts, pinned };
}

function Section({ title, pages }) {
  return (
    <div className="section-item">
      <h4>{title}</h4>
      <PageList pages={pages} />
    </div>
  );
}

export default function Index() {
  let { posts, pinned } = useLoaderData();
  return (
    <>
      {pinned.length > 0 && <Section title="Pinned" pages={pinned} />}
      <Section title="Posts" pages={posts} />
      <footer>
        Looking for old articles? See{' '}
        <a href="//archive.jlongster.com">archive.jlongster.com</a>
      </footer>
    </>
  );
}
