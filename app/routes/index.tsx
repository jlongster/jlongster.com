import { useLoaderData } from '@remix-run/react';
import { getPages } from '~/db/queries';
import { Paper } from '~/components/Paper';

export async function loader() {
  const posts = getPages()
    .filter((page: any) => {
      const tags = page.tags || [];
      return !(tags.includes('content') || tags.includes('experiment'));
    })
    .slice(0, 15);

  return { posts };
}

export default function Index() {
  const { posts } = useLoaderData() as { posts: any[] };

  return (
    <>
      <script src="/paper-animator.js" />
      <div className="min-h-screen bg-[#fcfbf9] p-8 overflow-visible grid place-items-center">
        {posts.slice(0, 2).map((post: any, index: number) => {
          return (
            <div key={post.url} className="col-start-1 row-start-1">
              <Paper title={post.title} url={post.url} rotation={0}>
                {post.abstract}
              </Paper>
            </div>
          );
        })}
      </div>
    </>
  );
}
