import { useLoaderData } from '@remix-run/react';
import { PageList } from '../page';
import { getPages } from '../db/website';

export async function loader({ params }) {
  let posts = getPages({ tags: ['post'] });
  let pinned = posts.filter(post =>
    post.properties.tags.find(t => t === 'pinned')
  );
  let sketches = getPages({ tags: ['sketchbook'] });
  return { posts, sketches, pinned };
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
  let { posts, sketches, pinned } = useLoaderData();
  return (
    <>
      {pinned.length > 0 && <Section title="Pinned" pages={pinned} />}
      <div className="section-grid">
        <Section title="Posts" pages={posts} />
        <Section title="Sketchbook" pages={sketches} />
      </div>
      <footer>
        Looking for old articles? See{' '}
        <a href="//archive.jlongster.com">archive.jlongster.com</a>
      </footer>
    </>
  );
}
