import { useLoaderData } from '@remix-run/react';
import { PageList } from '../page';
import { getPages } from '../db/website';

export async function loader({ params }) {
  let posts = getPages({ tagFilter: ['weekly'] });
  let weeklyPosts = getPages({ tag: 'weekly' });
  let interestPosts = getPages({ tag: 'interest' });
  return { posts, weeklyPosts, interestPosts };
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
  let { posts, weeklyPosts, interestPosts } = useLoaderData();
  return (
    <>
      <div className="section-grid">
        <Section title="Latest posts" pages={posts} />
        <Section title="Weekly notes" pages={weeklyPosts} />
        <Section title="Random interests" pages={interestPosts} />
      </div>
      <footer>
        Looking for old articles? See{' '}
        <a href="https://archive.jlongster.com">archive.jlongster.com</a>
      </footer>
    </>
  );
}
